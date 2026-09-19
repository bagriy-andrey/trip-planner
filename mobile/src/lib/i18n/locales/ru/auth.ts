export const auth = {
  fields: {
    name: { label: "Имя", placeholder: "Анна Иванова" },
    email: { label: "Email", placeholder: "name@example.com" },
    password: { label: "Пароль", placeholder: "Введите пароль" },
  },
  social: {
    apple: "Продолжить с Apple",
    google: "Продолжить с Google",
    divider: "или по email",
  },
  signIn: {
    title: "С возвращением",
    forgotPassword: "Забыли пароль?",
    submit: "Войти",
    noAccountPrompt: "Нет аккаунта?",
    createLink: "Создать",
  },
  signUp: {
    title: "Создать аккаунт",
    submit: "Зарегистрироваться",
    // The consent line is composed by the screen from four nested <Text> parts
    // (prefix + terms link + joiner + privacy link) so the links stay tappable.
    consentPrefix: "Регистрируясь, вы соглашаетесь с",
    termsLink: "Условиями использования",
    consentJoiner: "и",
    privacyLink: "Политикой конфиденциальности",
    hasAccountPrompt: "Уже есть аккаунт?",
    signInLink: "Войти",
  },
  forgotPassword: {
    title: "Восстановление пароля",
    description: "Укажите email, и мы отправим ссылку для сброса пароля.",
    submit: "Отправить ссылку",
  },
};
