import crypto from "crypto";
import asyncHandler from "../middlewares/asyncHAndler.middleware.js";
import Payment from "../models/payment.model.js";
import User from "../models/usermodel.js";
import AppError from "../utils/error.util.js";
import mockPaymentGateway from "../utils/mockpayment.js";

/**
 * @GET_RAZORPAY_ID
 * Returns the Razorpay API key for the client-side.
 */
export const getMockPaymentApiKey = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Mock payment API key",
      key: process.env.RAZORPAY_KEY_ID || "mock_key_id",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * @ACTIVATE_SUBSCRIPTION
 * Handles the subscription process for the user by creating a new mock subscription.
 */
export const buySubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("Unauthorized, please login"));
    }
    if (user.role === "ADMIN") {
      return next(new AppError("Admin cannot purchase a subscription", 400));
    }
    if (user.subscription.id && user.subscription.status === "created") {
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Already subscribed",
        subscription_id: user.subscription.id,
      });
    } else {
      const subscription = await mockPaymentGateway.createSubscription({
        plan_id: "mock_plan_id",
        customer_notify: 1,
        total_count: 12,
      });

      user.subscription.id = subscription.id;
      user.subscription.status = subscription.status;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Subscribed Successfully",
        subscription_id: subscription.id,
      });
    }
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * @VERIFY_SUBSCRIPTION
 * Verifies the payment for the subscription by validating the mock payment signature.
 */
export const verifySubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;
    const {
      razorpay_payment_id,
      razorpay_signature,
      razorpay_subscription_id,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("Unauthorized, please login"));
    }

    const subscriptionId = user.subscription.id;
    const generateSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET || "dummy_secret")
      .update(`${razorpay_payment_id}|${subscriptionId}`)
      .digest("hex");

    if (generateSignature !== razorpay_signature) {
      return next(new AppError("Payment not verified, please try again", 400));
    }

    await Payment.create({
      razorpay_payment_id,
      razorpay_signature,
      razorpay_subscription_id,
    });

    user.subscription.status = "active";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * @CANCEL_SUBSCRIPTION
 * Cancels the user's subscription with mock payment gateway and updates the user's subscription status to inactive.
 */
export const cancelSubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("Unauthorized, please login"));
    }
    if (user.role === "ADMIN") {
      return next(new AppError("Admin cannot cancel a subscription", 400));
    }

    const subscriptionId = user.subscription.id;
    const subscription = await mockPaymentGateway.cancelSubscription(
      subscriptionId
    );
    user.subscription.status = "inactive";

    await user.save();

    res.status(200).json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * @GET_PAYMENTS
 * Fetches and returns the payment records for all subscriptions, with monthly payment statistics.
 */
export const allPayments = asyncHandler(async (req, res, next) => {
  try {
    const { count, skip } = req.query;

    const allPayments = await mockPaymentGateway.getAllSubscriptions({
      count: count ? count : 10,
      skip: skip ? skip : 0,
    });

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const finalMonths = {
      January: 0,
      February: 0,
      March: 0,
      April: 0,
      May: 0,
      June: 0,
      July: 0,
      August: 0,
      September: 0,
      October: 0,
      November: 0,
      December: 0,
    };

    const monthlyWisePayments = allPayments.items.map((payment) => {
      const monthsInNumbers = new Date(payment.start_at * 1000);
      return monthNames[monthsInNumbers.getMonth()];
    });

    monthlyWisePayments.map((month) => {
      Object.keys(finalMonths).forEach((objMonth) => {
        if (month === objMonth) {
          finalMonths[month] += 1;
        }
      });
    });

    const monthlySalesRecord = [];
    Object.keys(finalMonths).forEach((monthName) => {
      monthlySalesRecord.push(finalMonths[monthName]);
    });

    res.status(200).json({
      success: true,
      message: "All payments fetched successfully",
      allPayments,
      finalMonths,
      monthlySalesRecord,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});
