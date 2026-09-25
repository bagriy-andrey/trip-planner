export const auth = {
  fields: {
    name: { label: "Ім’я", placeholder: "Andrew" },
    email: { label: "Email", placeholder: "you@example.com" },
    password: {
      label: "Пароль",
      placeholder: "Введіть пароль",
      hint: "Щонайменше 8 символів",
    },
    newPassword: {
      label: "Новий пароль",
      placeholder: "Введіть новий пароль",
    },
    code: { label: "Код із листа", placeholder: "123456" },
  },
  social: {
    apple: "Продовжити з Apple",
    google: "Продовжити з Google",
    divider: "або за email",
  },
  signIn: {
    title: "З поверненням",
    subtitle: "Увійдіть, щоб синхронізувати подорожі",
    forgotPassword: "Забули пароль?",
    submit: "Увійти",
    noAccountPrompt: "Немає акаунта?",
    createLink: "Створити",
  },
  signUp: {
    title: "Створити акаунт",
    subtitle: "Одна подорож, усі деталі — під рукою",
    submit: "Зареєструватися",
    // The consent line is composed by the screen from four nested <Text> parts
    // (prefix + terms link + joiner + privacy link) so the links stay tappable.
    consentPrefix: "Реєструючись, ви погоджуєтеся з",
    termsLink: "Умовами використання",
    consentJoiner: "і",
    privacyLink: "Політикою конфіденційності",
    hasAccountPrompt: "Уже є акаунт?",
    signInLink: "Увійти",
    // Action under the email field when the address is already registered (leads to S2).
    emailExistsAction: "Увійти",
  },
  forgotPassword: {
    title: "Відновлення пароля",
    description: "Вкажіть email, і ми надішлемо на нього код для скидання пароля.",
    submit: "Надіслати код",
  },
  resetPassword: {
    title: "Новий пароль",
    // Identical for a registered and an unknown address (SPEC-02 AC-28): never confirms either.
    notice: "Якщо такий акаунт існує, ми надіслали на нього код",
    submit: "Зберегти пароль",
    resend: "Надіслати код ще раз",
    resendIn: "Надіслати код ще раз через {{seconds}} с",
  },
  // Field errors of the shared form schemas, keyed by the stable ids of `@tripplanner/shared`.
  validation: {
    email: { invalid: "Введіть коректний email" },
    password: { tooShort: "Щонайменше 8 символів" },
    name: {
      empty: "Введіть ім’я",
      tooLong: "Ім’я не довше 64 символів",
    },
    code: {
      length: "Введіть 6 цифр із листа",
      digits: "Код складається лише з цифр",
    },
  },
  // Answers of the auth api (a closed set of kinds): the server's own text is never shown.
  errors: {
    invalidCredentials: "Неправильний email або пароль",
    emailExists: "Акаунт із таким email уже існує",
    weakPassword: "Пароль надто слабкий. Щонайменше 8 символів",
    otpInvalidOrExpired: "Код неправильний або застарів",
    samePassword: "Новий пароль має відрізнятися від старого",
    rateLimited: "Забагато спроб, спробуйте пізніше",
    emailRateLimited: "Надто часто, спробуйте пізніше",
    offline: "Немає з’єднання. Перевірте інтернет і спробуйте ще раз",
    unknown: "Щось пішло не так. Спробуйте ще раз",
  },
};
