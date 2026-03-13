"use server";

import { headers } from "next/headers";
import { auth } from "../better-auth/auth";
import { inngest } from "../inngest/client";

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const response = await auth.api.signUpEmail({
      body: { email: email, password: password, name: fullName },
    });

    if (response) {
      try {
        await inngest.send({
          name: "app/user.created",
          data: {
            email: email,
            name: fullName,
            country: country,
            investmentGoals: investmentGoals,
            riskTolerance: riskTolerance,
            preferredIndustry: preferredIndustry,
          },
        });
      } catch (eventError) {
        console.error("Post-signup event enqueue failed", eventError);
      }
    }
    return { success: true, data: response };
  } catch (e) {
    console.log("Sign up failed", e);
    return { success: false, message: "Sign up failed. Please try again." };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({
      body: { email: email, password: password },
    });

    return { success: true, data: response };
  } catch (e) {
    console.log("Sign in failed", e);
    return { success: false, message: "Sign in failed. Please try again." };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({ headers: await headers() });
    return { success: true };
  } catch (e) {
    console.log("Sign out failed", e);
    return { success: false, message: "Sign out failed. Please try again." };
  }
};
