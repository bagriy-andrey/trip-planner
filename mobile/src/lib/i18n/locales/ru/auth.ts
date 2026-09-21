export const auth = {
  fields: {
    name: { label: "Имя", placeholder: "Andrew" },
    email: { label: "Email", placeholder: "you@example.com" },
    password: {
      label: "Пароль",
      placeholder: "Введите пароль",
      hint: "Минимум 8 символов",
    },
    newPassword: {
      label: "Новый пароль",
      placeholder: "Введите новый пароль",
    },
    code: { label: "Код из письма", placeholder: "123456" },
  },
  social: {
    apple: "Продолжить с Apple",
    google: "Продолжить с Google",
    divider: "или по email",
  },
  signIn: {
    title: "С возвращением",
    subtitle: "Войдите, чтобы синхронизировать поездки",
    forgotPassword: "Забыли пароль?",
    submit: "Войти",
    noAccountPrompt: "Нет аккаунта?",
    createLink: "Создать",
  },
  signUp: {
    title: "Создать аккаунт",
    subtitle: "Одна поездка, все детали — под рукой",
    submit: "Зарегистрироваться",
    // The consent line is composed by the screen from four nested <Text> parts
    // (prefix + terms link + joiner + privacy link) so the links stay tappable.
    consentPrefix: "Регистрируясь, вы соглашаетесь с",
    termsLink: "Условиями использования",
    consentJoiner: "и",
    privacyLink: "Политикой конфиденциальности",
    hasAccountPrompt: "Уже есть аккаунт?",
    signInLink: "Войти",
    // Action under the email field when the address is already registered (leads to S2).
    emailExistsAction: "Войти",
  },
  forgotPassword: {
    title: "Восстановление пароля",
    description: "Укажите email, и мы отправим на него код для сброса пароля.",
    submit: "Отправить код",
  },
  resetPassword: {
    title: "Новый пароль",
    // Identical for a registered and an unknown address (SPEC-02 AC-28): never confirms either.
    notice: "Если такой аккаунт существует, мы отправили на него код",
    submit: "Сохранить пароль",
    resend: "Отправить код ещё раз",
    resendIn: "Отправить код ещё раз через {{seconds}} с",
  },
  // Field errors of the shared form schemas, keyed by the stable ids of `@tripplanner/shared`.
  validation: {
    email: { invalid: "Введите корректный email" },
    password: { tooShort: "Минимум 8 символов" },
    name: {
      empty: "Введите имя",
      tooLong: "Имя не длиннее 64 символов",
    },
    code: {
      length: "Введите 6 цифр из письма",
      digits: "Код состоит только из цифр",
    },
  },
  // Answers of the auth api (a closed set of kinds): the server's own text is never shown.
  errors: {
    invalidCredentials: "Неверный email или пароль",
    emailExists: "Аккаунт с таким email уже существует",
    weakPassword: "Пароль слишком слабый. Минимум 8 символов",
    otpInvalidOrExpired: "Код неверен или устарел",
    samePassword: "Новый пароль должен отличаться от старого",
    rateLimited: "Слишком много попыток, попробуйте позже",
    emailRateLimited: "Слишком часто, попробуйте позже",
    offline: "Нет соединения. Проверьте интернет и попробуйте ещё раз",
    unknown: "Что-то пошло не так. Попробуйте ещё раз",
  },
};
