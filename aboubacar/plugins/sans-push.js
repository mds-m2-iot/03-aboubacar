// Le compte Apple gratuit (Personal Team) refuse la capacite Push Notifications.
// expo-notifications l'ajoute d'office : on la retire, les notifications locales n'en ont pas besoin.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
