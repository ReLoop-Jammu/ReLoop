import type { Category } from "@/features/inventory/model";

/** Test list per category, used for grading. Grade A = everything passes. */
export const CHECKLISTS: Record<Category, string[]> = {
  phone: ["Powers on", "Display", "Touch", "Cameras", "Battery health", "Charging", "Buttons"],
  laptop: ["Powers on", "Display", "Keyboard", "Trackpad", "Battery health", "Ports", "Wi-Fi"],
  desktop: ["Powers on", "Boots", "Ports", "Storage"],
  monitor: ["Powers on", "Display", "No dead pixels", "Inputs"],
  tv: ["Powers on", "Display", "Sound", "Inputs", "Remote"],
  printer: ["Powers on", "Test print", "Paper feed"],
  ups: ["Powers on", "Battery holds charge", "Output"],
  small_appliance: ["Powers on", "Works as intended", "Wiring safe"],
  accessory: ["Works", "Cable / connector"],
  part: ["Tested working"],
};
