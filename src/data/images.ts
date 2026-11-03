import type { ImageSourcePropType } from "react-native";

// Static requires so Metro bundles the assets.
// Generated from src/data/questions.json — keep in sync.
const IMAGES: Record<string, ImageSourcePropType> = {
  "q130_1.jpg": require("../assets/questions/q130_1.jpg"),
  "q176_1.png": require("../assets/questions/q176_1.png"),
  "q181_1.jpg": require("../assets/questions/q181_1.jpg"),
  "q187_1.png": require("../assets/questions/q187_1.png"),
  "q209_1.png": require("../assets/questions/q209_1.png"),
  "q209_2.png": require("../assets/questions/q209_2.png"),
  "q209_3.png": require("../assets/questions/q209_3.png"),
  "q209_4.png": require("../assets/questions/q209_4.png"),
  "q216_1.jpg": require("../assets/questions/q216_1.jpg"),
  "q21_1.png": require("../assets/questions/q21_1.png"),
  "q21_2.png": require("../assets/questions/q21_2.png"),
  "q21_3.png": require("../assets/questions/q21_3.png"),
  "q21_4.png": require("../assets/questions/q21_4.png"),
  "q226_1.png": require("../assets/questions/q226_1.png"),
  "q226_2.png": require("../assets/questions/q226_2.png"),
  "q226_3.png": require("../assets/questions/q226_3.png"),
  "q226_4.png": require("../assets/questions/q226_4.png"),
  "q235_1.jpg": require("../assets/questions/q235_1.jpg"),
  "q321_1.png": require("../assets/questions/q321_1.png"),
  "q321_2.png": require("../assets/questions/q321_2.png"),
  "q321_3.png": require("../assets/questions/q321_3.png"),
  "q321_4.png": require("../assets/questions/q321_4.png"),
  "q328_1.png": require("../assets/questions/q328_1.png"),
  "q55_1.jpg": require("../assets/questions/q55_1.jpg"),
  "q70_1.jpg": require("../assets/questions/q70_1.jpg"),
};

export function getImages(names?: string[]): ImageSourcePropType[] {
  if (!names) return [];
  return names.map((n) => IMAGES[n]).filter(Boolean);
}
