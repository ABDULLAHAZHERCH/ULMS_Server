import cloudinary from "cloudinary"
import crypto from 'crypto';
import fs from 'fs/promises'

import asyncHandler from "../middlewares/asyncHAndler.middleware.js";
import User from "../models/usermodel.js";
import AppError from "../utils/error.util.js";
import sendEmail from "../utils/sendEmail.js";

const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true
};

/**
 * @REGISTER - Registers a new user
 */
export const register = asyncHandler(async (req, res, next) => {
    try {
        // Check if file exists in request
        if (!req.file) {
          return next(new AppError('Avatar image is required', 400));
        }
    
        const { fullName, email, password } = req.body;
    
        if (!fullName || !email || !password) {
          return next(new AppError('All fields are required', 400));
        }
    
        // Check file size
        if (req.file.size > 50 * 1024 * 1024) {
          return next(new AppError('File size too large. Maximum size is 50MB', 400));
        }
    
        // Create user first with default avatar
        const user = await User.create({
          fullName,
          email,
          password,
          avatar: {
            public_id: email,
            secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
          }
        });
    
        if (!user) {
          return next(new AppError('User registration failed, please try again', 400));
        }
    
        // Upload to Cloudinary using the buffer
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            {
              folder: 'lms',
              width: 250,
              height: 250,
              gravity: 'faces',
              crop: 'fill',
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
    
          // Write the buffer to the upload stream
          uploadStream.end(req.file.buffer);
        });
    
        // Update user with Cloudinary response
        user.avatar = {
          public_id: result.public_id,
          secure_url: result.secure_url
        };
    
        await user.save();
    
        // Generate JWT token
        const token = await user.generateJWTToken();
        user.password = undefined;
    
        res.cookie('token', token, cookieOptions);
    
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user
        });
    
      } catch (error) {
        console.error('Registration error:', error);
        return next(new AppError(error.message || 'Registration failed', 500));
      }
    });
  

/**
 * @LOGIN - Logs in an existing user
 */
export const login=asyncHandler(async (req,res,next)=>{

    try {

        const {email, password}= req.body;

        if(!email||!password){
            return next(new AppError('Email and Password are required ', 400));
        }
    
        const user= await User.findOne({
            email
        }).select('+password');
    
        if(!(user &&(await user.comparePassword(password)))){
            return next(
                new AppError('Email or password does not match ', 400)
            );
        }
    
        const token = await user.generateJWTToken();
        user.password= undefined;
    
    
        res.cookie('token', token, { ...cookieOptions, sameSite: 'None' });
    
        res.status(200).json({
            success: true,
            message:'User logged in Successfully',
            user,
        })
        
    } catch (e) {
       return next(new
         AppError(e.message, 500));
    }

   
});
/**
 * @LOGOUT - Logs out the user by clearing the token cookie
 */
export const logout=asyncHandler(async(req,res,next)=>{
    res.cookie('token', null, {
        secure:true,
        maxAge:0,
        httpOnly:true
    });

    res.status(200).json({
        success: true,
        message:'User logged out  Successfully',
    })
});
/**
 * @LOGGED_IN_USER_DETAILS - Fetches details of the logged-in user
 */
export const getProfile=asyncHandler(async (req,res, next)=>{
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        res.status(200).json({
            success: true,
            message:'User details ',
            user,
        })
    } catch (e) {
        return next(new AppError('Failed to fetch profile ', 500));
    }

});
/**
 * @FORGOT_PASSWORD - Sends a password reset token to the user's email
 */
export const forgotPassword=asyncHandler(async(req, res,next)=>{

    const {email}= req.body;

    if(!email){
        return next(new AppError('Email is required ', 400)
        );
    }

    const user = await User.findOne({email});
    if(!user){
        return next(new AppError('Email  not registered ', 400)
        );
    }

    const resetToken = await user.generatePasswordResetToken();

    await user.save();

    const resetPasswordUrl =`${process.env.FRONTEND_URL}reset-password/${resetToken}`;
     
    const subject = 'Reset Password';
    const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;
    
    try{
        await sendEmail(email,subject, message);

        res.status(200).json({
            success: true,
            message:`Reset password token has been sent to ${email} Sucessfully`,
        })
    } catch(e ){
        user.forgotPasswordExpiry=undefined;
        user.forgotPasswordToken=undefined;

        await user.save();
        return next(new AppError(e.message, 500)
        );
    }
});
/**
 * @RESET_PASSWORD - Resets the password using a valid token
 */
export const resetPassword =asyncHandler(async(req, res,next )=>{
        const { resetToken}= req.params;

        const {password}= req.body;

        const forgotPasswordToken= crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const user = await User.findOne(
            {
                forgotPasswordToken,
                forgotPasswordExpiry:{ $gt: Date.now()}
            }
        );

        if(!user){
            return next(new AppError("Token is invailid or expired , please try again", 400))
            
        }

        user.password=password;
        user.forgotPasswordExpiry=undefined;
        user.forgotPasswordToken=undefined;
        
        user.save();

        res.status(200).json({
            success: true,
            message:`Password Changed Sucessfully`,
        })
});
/**
 * @CHANGE_PASSWORD - Changes the current password for the logged-in user
 */
export const changePassword =asyncHandler(async(req, res, next)=>{
    const { oldPassword, newPassword}= req.body;
    const {id}= req.user;
    
    if(!oldPassword||!newPassword){
        return next(new AppError("All fields are manddatory", 400))
    }

    const user = await User.findById(id).select('+password');
    if(!user){
        return next(new AppError("user does not exist", 400))
    }

    const isPasswordValid = await user.comparePassword(oldPassword);

    if(!isPasswordValid){
        return next(new AppError("Invalid old password", 400))
    }

    user.password = newPassword;

    await user.save();

    user.password=undefined;

    res.status(200).json({
        success: true,
        message:`Password  changed Sucessfully`,
    })
})
/**
 * @UPDATE_USER - Updates the user details (name and avatar)
 */
export const updateUser=asyncHandler(async(req, res,next)=>{

    const {fullName }=req.body;
    const {id} =req.user;
    console.log(id)

    const user = await User.findById(id);

    if(!user){
        return next(new AppError("user does not exist", 400))
    }

    if(fullName){
        user.fullName=fullName;     
    }

    if(req.file){
        // deleting the previous avatar
        if (user.avatar.public_id){
            try {    
                await cloudinary.v2.uploader.destroy(user.avatar.public_id);
            } catch (error) {
                console.error('Cloudinary delete error:', error);
                //continue updating the avatar even if the deletion fails
            }
        }

        // Upload to Cloudinary using the buffer
        try {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.v2.uploader.upload_stream(
                    {
                        folder: 'lms',
                        width: 250,
                        height: 250,
                        gravity: 'faces',
                        crop: 'fill',
                    },
                    (error, uploadResult) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                        } else {
                            resolve(uploadResult);
                        }
                    }
                );

                // Write the buffer to the upload stream
                uploadStream.end(req.file.buffer);
            }); 

            // Update user with Cloudinary response
            if (result) {
                user.avatar = {
                    public_id: result.public_id,
                    secure_url: result.secure_url
                };
            }
        } catch (error) {
            return next(
                new AppError('Avatar upload failed, please try again', 500)
            );
        }
    }
    await user.save();

    res.status(200).json({
        success: true,
        message:`User details updated  Sucessfully`,
    })
})
