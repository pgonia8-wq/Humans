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

// Traducciones completas: PostCard + ProfileModal + Inbox
const translations: Record<Language, Translations> = {
  es: {
    // --- PostCard / Feed ---
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
    escribe_comentario: "Escribe un comentario...",
    tip_enviado: "¡Tip enviado!",
    pago_cancelado: "Pago cancelado o fallido",
    boost_enviado: "¡Boost enviado!",
    post_citado: "¡Post citado!",
    escribe_para_citar: "Escribe tu comentario para citar el post",
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
    cargando_comentarios: "Cargando comentarios...",
    no_hay_comentarios: "No hay comentarios aún",

    // --- ProfileModal ---
    tu_perfil: "Tu Perfil",
    perfil_guardado: "Perfil guardado",
    cargando_perfil: "Cargando perfil...",
    cerrar_modal: "Cerrar modal",
    avatar_actualizado: "Avatar actualizado",
    error_guardar: "Error al guardar",
    subiendo: "Subiendo...",
    cambiar_avatar: "Cambiar avatar",
    nombre_usuario: "Nombre de usuario",
    nombre: "Nombre",
    biografia: "Biografía ({count})",
    cuentanos_sobre_ti: "Cuéntanos sobre ti",
    fecha_nacimiento: "Fecha de nacimiento",
    ciudad: "Ciudad",
    pais: "País",
    perfil_visible: "Perfil visible",
    guardando: "Guardando...",
    guardar: "Guardar",
    cerrar: "Cerrar",
    id_no_encontrado: "ID no encontrado",
    minikit_no_detectado: "MiniKit no detectado",
    suscripcion_chat_exclusivo: "Suscripción chat exclusivo",
    pago_cancelado_chat: "Pago cancelado",
    error_pago: "Error en el pago",
    suscripcion_exitosa: "Suscripción exitosa",
    suscribirse_chat_premium: "Suscribirse al chat premium ({amount} WLD)",
    chat_exclusivo_creadores_tokens: "Chat Exclusivo Creadores de Tokens",

    // --- Inbox / Modal de Mensajes ---
    mensajes: "Mensajes",
    buscar_seguidores: "Buscar seguidores...",
    cargando: "Cargando...",

    // --- HomePage / FeedPage (CORRECCIÓN F3: claves faltantes) ---
    create_post: "Crear publicación",
    whats_happening: "¿Qué está pasando?",
    write_before_posting: "Escribe algo antes de publicar",
    procesando: "Procesando...",
    add_image: "Imagen",
    publish: "Publicar",
    post: "Post",
    notifications: "Notificaciones",
    no_tips_para_free: "Solo usuarios verificados pueden recibir tips",
    escribe_tu_mensaje: "Escribe tu mensaje aquí...",
    enviando: "Enviando...",
    cancel: "Cancelar",
    avatar: "Avatar de usuario",
    ahora_mismo: "ahora mismo",
  },
  en: {
    // --- PostCard / Feed ---
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
    escribe_comentario: "Write a comment...",
    tip_enviado: "Tip sent!",
    pago_cancelado: "Payment canceled or failed",
    boost_enviado: "Boost sent!",
    post_citado: "Post quoted!",
    escribe_para_citar: "Write your comment to quote the post",
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
    cargando_comentarios: "Loading comments...",
    no_hay_comentarios: "No comments yet",

    // --- ProfileModal ---
    tu_perfil: "Your Profile",
    perfil_guardado: "Profile saved",
    cargando_perfil: "Loading profile...",
    cerrar_modal: "Close modal",
    avatar_actualizado: "Avatar updated",
    error_guardar: "Error saving",
    subiendo: "Uploading...",
    cambiar_avatar: "Change avatar",
    nombre_usuario: "Username",
    nombre: "Name",
    biografia: "Biography ({count})",
    cuentanos_sobre_ti: "Tell us about yourself",
    fecha_nacimiento: "Birthdate",
    ciudad: "City",
    pais: "Country",
    perfil_visible: "Profile visible",
    guardando: "Saving...",
    guardar: "Save",
    cerrar: "Close",
    id_no_encontrado: "ID not found",
    minikit_no_detectado: "MiniKit not detected",
    suscripcion_chat_exclusivo: "Exclusive chat subscription",
    pago_cancelado_chat: "Payment canceled",
    error_pago: "Payment error",
    suscripcion_exitosa: "Subscription successful",
    suscribirse_chat_premium: "Subscribe to premium chat ({amount} WLD)",
    chat_exclusivo_creadores_tokens: "Exclusive Token Creators Chat",

    // --- Inbox / Modal de Mensajes ---
    mensajes: "Messages",
    buscar_seguidores: "Search followers...",
    cargando: "Loading...",

    // --- HomePage / FeedPage (CORRECCIÓN F3: claves faltantes) ---
    create_post: "Create post",
    whats_happening: "What's happening?",
    write_before_posting: "Write something before posting",
    procesando: "Processing...",
    add_image: "Image",
    publish: "Publish",
    post: "Post",
    notifications: "Notifications",
    no_tips_para_free: "Only verified users can receive tips",
    escribe_tu_mensaje: "Write your message here...",
    enviando: "Sending...",
    cancel: "Cancel",
    avatar: "User avatar",
    ahora_mismo: "just now",
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
