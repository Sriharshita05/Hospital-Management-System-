// Small helpers for the logged-in user (stored by the Login page)

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("hospital_user") || "{}");
  } catch {
    return {};
  }
};

export const clearSession = () => {
  localStorage.removeItem("hospital_token");
  localStorage.removeItem("hospital_user");
};

// Reads the "exp" claim from the JWT (no secret needed, only for UX)
export const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
};

export const ROLE_LABELS = {
  admin: "Admin",
  clinician: "Doctor",
  frontDesk: "Receptionist",
  client: "Client"
};

export const roleLabel = (role) => ROLE_LABELS[role] || "User";

export const isClient = () => getUser().role === "client";
