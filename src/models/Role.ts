import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string; // Unique identifier (e.g., "sales_staff", "branch_manager")
  displayName: string; // Display name (e.g., "พนักงานขาย", "หัวหน้าสาขา")
  permissions: string[]; // Array of permission strings
  description?: string;
  isSystem: boolean; // true = built-in role (cannot delete), false = custom role
  color?: string; // Badge color for UI
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "gray",
    },
  },
  {
    timestamps: true,
  }
);

// `name` is already indexed by `unique: true` above; re-declaring it here
// created a conflicting non-unique name_1 and broke syncIndexes().
RoleSchema.index({ isSystem: 1 });

export default mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
