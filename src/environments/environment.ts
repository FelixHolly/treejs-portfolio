/** Development values; production builds swap this file for environment.prod.ts (fileReplacements in angular.json). */
export const environment = {
  production: false,
  // An EmailJS public key is meant to ship to the browser: it is rate-limited and bound to the domain
  emailJs: {
    serviceId: "service_cvyf4pk",
    templateId: "template_1cbxfpl",
    publicKey: "uxjMVOPJ12-pBwK7L",
  },
  assets: {
    dracoPath: "assets/draco/",
    models: {
      heroModel: "assets/models/vienna-lowe.glb",
    },
  },
};
