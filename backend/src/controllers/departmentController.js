
import Department from "../models/Department.js";
import logAudit from "../utils/auditLogger.js";


export const createDepartment = async (req, res) => {
  try {
    const {
      departmentId,
      name,
      description,
      location
    } = req.body;

    if (!departmentId || !name) {
      return res.status(400).json({
        success: false,
        message: "Department ID and name are required"
      });
    }

    const existingDepartment = await Department.findOne({
      $or: [
        { departmentId },
        { name }
      ]
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department ID or name already exists"
      });
    }

    const department = await Department.create({
      departmentId,
      name,
      description,
      location
    });

    // Record department creation
    await logAudit(
      req,
      "CREATE",
      "Department",
      "Created a new department",
      department.departmentId
    );

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department
    });

  } catch (error) {
    console.error("Department creation error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Department already exists"
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid department information"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating department"
    });
  }
};

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });

  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching departments"
    });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findOne({
      departmentId
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: department
    });

  } catch (error) {
    console.error("Get department error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching department"
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const allowedFields = [
      "name",
      "description",
      "location",
      "isActive"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }

    const department = await Department.findOneAndUpdate(
      { departmentId },
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!department) {
  return res.status(404).json({
    success: false,
    message: "Department not found"
  });
}

await logAudit(
  req,
  "UPDATE",
  "Department",
  "Updated department details",
  department.departmentId
);

return res.status(200).json({
  success: true,
  message: "Department updated successfully",
  data: department
});

  } catch (error) {
    console.error("Update department error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Department name already exists"
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid department information"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating department"
    });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findOneAndUpdate(
      { departmentId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Active department not found"
      });
    }
    await logAudit(
  req,
  "DEACTIVATE",
  "Department",
  "Deactivated a department",
  department.departmentId
);
    return res.status(200).json({
      success: true,
      message: "Department deactivated successfully",
      data: department
    });

  } catch (error) {
    console.error("Delete department error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deactivating department"
    });
  }
};
