import React, { createContext, useState, useContext, ReactNode } from "react";

type Language = "es" | "en";

interface Translations {
  [key: string]: string;
}

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Traducciones completas para PostCard
const translations: Record<Language, Translations> = {
  es: {
    // Botones y acciones
    seguir: "Seguir",
    siguiendo: "Siguiendo",
    enviar: "Enviar",
    tip: "Tip",
    boost_5_wld: "Boost 5 WLD",
    chat_exclusivo: "Chat Exclusivo Creadores de Tokens",
    repostear: "Repostear",
    citar_post: "Citar post",
    cancelar: "Cancelar",
    ver_comentarios: "Ver",
    ocultar_comentarios: "Ocultar",
    // Placeholders
    escribe_comentario: "Escribe un comentario...",
    // Alerts y mensajes
    tip_enviado: "¡Tip enviado!",
    pago_cancelado: "Pago cancelado o fallido",
    boost_enviado: "¡Boost enviado!",
    post_citado: "¡Post citado!",
    escribe_para_citar: "Escribe tu comentario para citar el post",
    // Errores
    debes_estar_logueado: "Debes estar logueado",
    min_wld: "Mínimo 1 WLD",
    error_registrando_view: "Error registrando vista",
    error_cargando_comentarios: "No se pudieron cargar los comentarios",
    error_al_dar_like: "Error al dar like: ",
    error_al_comentar: "Error al comentar: ",
    error_al_repostear: "Error al repostear: ",
    error_al_citar: "Error al citar: ",
    error_en_tip: "Error en tip: ",
    error_en_boost: "Error en boost: ",
    error_procesar_pago: "Error al procesar pago: ",
    // Estados
    cargando_comentarios: "Cargando comentarios...",
    no_hay_comentarios: "No hay comentarios aún",
  },
  en: {
    // Botones y acciones
    seguir: "Follow",
    siguiendo: "Following",
    enviar: "Send",
    tip: "Tip",
    boost_5_wld: "Boost 5 WLD",
    chat_exclusivo: "Exclusive Token Creators Chat",
    repostear: "Repost",
    citar_post: "Quote post",
    cancelar: "Cancel",
    ver_comentarios: "View",
    ocultar_comentarios: "Hide",
    // Placeholders
    escribe_comentario: "Write a comment...",
    // Alerts y mensajes
    tip_enviado: "Tip sent!",
    pago_cancelado: "Payment canceled or failed",
    boost_enviado: "Boost sent!",
    post_citado: "Post quoted!",
    escribe_para_citar: "Write your comment to quote the post",
    // Errores
    debes_estar_logueado: "You must be logged in",
    min_wld: "Minimum 1 WLD",
    error_registrando_view: "Error registering view",
    error_cargando_comentarios: "Could not load comments",
    error_al_dar_like: "Error liking: ",
    error_al_comentar: "Error commenting: ",
    error_al_repostear: "Error reposting: ",
    error_al_citar: "Error quoting: ",
    error_en_tip: "Tip error: ",
    error_en_boost: "Boost error: ",
    error_procesar_pago: "Payment processing error: ",
    // Estados
    cargando_comentarios: "Loading comments...",
    no_hay_comentarios: "No comments yet",
  },
};

const LanguageContext = createContext<LanguageContextProps>({
  language: "es",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("es");

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export { LanguageContext };
