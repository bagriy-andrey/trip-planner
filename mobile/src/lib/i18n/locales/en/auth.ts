export const auth = {
  fields: {
    name: { label: "Name", placeholder: "Anna Smith" },
    email: { label: "Email", placeholder: "name@example.com" },
    password: { label: "Password", placeholder: "Enter your password" },
  },
  social: {
    apple: "Continue with Apple",
    google: "Continue with Google",
    divider: "or with email",
  },
  signIn: {
    title: "Welcome back",
    forgotPassword: "Forgot password?",
    submit: "Sign in",
    noAccountPrompt: "Don't have an account?",
    createLink: "Create one",
  },
  signUp: {
    title: "Create account",
    submit: "Sign up",
    consentPrefix: "By signing up, you agree to the",
    termsLink: "Terms of Use",
    consentJoiner: "and",
    privacyLink: "Privacy Policy",
    hasAccountPrompt: "Already have an account?",
    signInLink: "Sign in",
  },
  forgotPassword: {
    title: "Reset password",
    description: "Enter your email and we will send you a link to reset your password.",
    submit: "Send link",
  },
};
