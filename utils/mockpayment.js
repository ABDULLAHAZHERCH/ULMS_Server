const mockPaymentGateway = {
  subscriptions: [
    {
      id: "sub_12345",
      plan_id: "plan_abc",
      status: "active",
      start_at: Math.floor(Date.now() / 1000) - 3600 * 24 * 30, // 30 days ago
    },
    {
      id: "sub_67890",
      plan_id: "plan_xyz",
      status: "inactive",
      start_at: Math.floor(Date.now() / 1000) - 3600 * 24 * 60, // 60 days ago
    },
    {
      id: "sub_11223",
      plan_id: "plan_def",
      status: "active",
      start_at: Math.floor(Date.now() / 1000) - 3600 * 24 * 15, // 15 days ago
    },
  ],

  createSubscription: async ({ plan_id, customer_notify, total_count }) => {
    const subscriptionId = `sub_${Date.now()}`;
    const newSubscription = {
      id: subscriptionId,
      plan_id,
      status: "created",
      start_at: Math.floor(Date.now() / 1000),
    };
    mockPaymentGateway.subscriptions.push(newSubscription);
    return newSubscription;
  },

  verifyPayment: async ({ payment_id, subscription_id }) => {
    return payment_id && subscription_id
      ? { success: true, message: "Payment verified successfully." }
      : { success: false, message: "Payment verification failed." };
  },

  cancelSubscription: async (subscription_id) => {
    const subscription = mockPaymentGateway.subscriptions.find(
      (sub) => sub.id === subscription_id
    );
    if (subscription) {
      subscription.status = "inactive";
      return { success: true, message: "Subscription cancelled successfully." };
    }
    return { success: false, message: "Cancellation failed." };
  },

  getAllSubscriptions: async ({ count = 10, skip = 0 }) => {
    const paginatedSubscriptions = mockPaymentGateway.subscriptions.slice(
      skip,
      skip + count
    );
    return {
      success: true,
      items: paginatedSubscriptions,
      total_count: mockPaymentGateway.subscriptions.length,
    };
  },
};

export default mockPaymentGateway;
