// Record-level authorization helper.
// A clinician account that is linked to a Doctor profile may only see
// that doctor's clinical records. Admins see everything.
export const clinicianScope = (req) => {
  if (req.staff?.role === "clinician" && req.staff.doctor) {
    return { doctor: req.staff.doctor };
  }
  return {};
};

export const isLinkedClinician = (req) =>
  req.staff?.role === "clinician" && Boolean(req.staff.doctor);
