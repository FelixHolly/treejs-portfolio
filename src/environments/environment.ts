/**
 * Development environment configuration.
 *
 * This file is replaced with environment.prod.ts during production builds
 * via the fileReplacements array in angular.json.
 *
 * Environment-specific values:
 * - EmailJS credentials: Development instance for testing contact form
 * - Asset paths: Relative paths to 3D models and decoder libraries
 *
 * Security note:
 * EmailJS public keys are safe to commit as they are rate-limited and
 * require domain verification in the EmailJS dashboard.
 */
export const environment = {
  production: false,

  /**
   * EmailJS service configuration for contact form submissions.
   * Credentials are obtained from EmailJS dashboard.
   */
  emailJs: {
    serviceId: "service_cvyf4pk",
    templateId: "template_1cbxfpl",
    publicKey: "uxjMVOPJ12-pBwK7L",
  },

  /**
   * Asset path configuration for 3D resources.
   *
   * dracoPath: DRACO decoder WebAssembly files for GLTF compression
   * models: 3D model file paths (GLB format with DRACO compression)
   */
  assets: {
    dracoPath: "assets/draco/",
    models: {
      heroModel: "assets/models/vienna-lowe.glb",
      projectPhone: "assets/models/future-phone.glb",
    },
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
