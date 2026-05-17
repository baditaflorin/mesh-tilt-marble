import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-tilt-marble",
  description: "Tilt your phone; the group's average vector navigates a shared marble.",
  accentHex: "#6da3ff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
