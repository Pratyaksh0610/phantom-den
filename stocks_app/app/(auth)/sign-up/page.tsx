"use client";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import {
  emailRegex,
  INVESTMENT_GOALS,
  PREFERRED_INDUSTRIES,
  RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function SignUp() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      country: "US",
      investmentGoals: "Growth",
      riskTolerance: "Medium",
      preferredIndustry: "Technology",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      const result = await signUpWithEmail(data);
      if (result.success) {
        router.push("/");
      } else {
        toast.error("Sign up failed", {
          description: result.message || "Failed to create an account",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Sign up failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create an account",
      });
    }
  };
  return (
    <>
      <h1 className="form-title"> Sign Up & Personalize</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="fullName"
          label="Full Name"
          placeholder="John Doe"
          register={register}
          error={errors.fullName}
          validation={{
            required: {
              value: true,
              message: "Full name is mandatory",
            },
            minLength: {
              value: 2,
              message: "Minimum length should be greater than 2",
            },
          }}
        />
        <InputField
          name="email"
          label="Email"
          placeholder="johndoe@email.com"
          register={register}
          error={errors.email}
          validation={{
            required: {
              value: true,
              message: "Email is mandatory",
            },
            pattern: {
              value: emailRegex,
              message: "Please enter a valid Email",
            },
          }}
        />
        <InputField
          name="password"
          label="Password"
          type="password"
          placeholder="Enter a strong password"
          register={register}
          error={errors.password}
          validation={{
            required: {
              value: true,
              message: "Password is mandatory",
            },
            minLength: {
              value: 8,
              message: "Length should be at least 8",
            },
          }}
        />
        <CountrySelectField
          name="country"
          label="Country"
          control={control}
          error={errors.country}
          required
        />
        <SelectField
          name="investmentGoals"
          label="Investment Goals"
          placeholder="Select your investment goal"
          options={INVESTMENT_GOALS}
          control={control}
          error={errors.investmentGoals}
          required
        />
        <SelectField
          name="riskTolerance"
          label="Risk Tolerance"
          placeholder="Select your risk level"
          options={RISK_TOLERANCE_OPTIONS}
          control={control}
          error={errors.riskTolerance}
          required
        />
        <SelectField
          name="preferredIndustry"
          label="Preferred Industry"
          placeholder="Select your preferred industry"
          options={PREFERRED_INDUSTRIES}
          control={control}
          error={errors.preferredIndustry}
          required
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Creating Account" : "Start your Investing Journey"}
        </Button>
        <FooterLink
          text="Already have an account"
          linkText="Sign in"
          href="/sign-in"
        />
      </form>
    </>
  );
}
