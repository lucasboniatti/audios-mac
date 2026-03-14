/**
 * AudioFlow Brand Assets
 * Source of truth lives in AudioFlow/Assets and is exposed to the web via /shared-assets.
 */

export const sharedAssetsBasePath = '/shared-assets';

export const brandAssets = {
  logos: {
    primary: `${sharedAssetsBasePath}/logo.svg`,
    transparent: `${sharedAssetsBasePath}/logo-transparent.svg`,
    whiteBackground: `${sharedAssetsBasePath}/logo-white-bg.svg`,
  },
  raster: {
    transparent: `${sharedAssetsBasePath}/logo-transparent.png`,
    whiteBackground: `${sharedAssetsBasePath}/logo-white-bg.png`,
  },
  animated: {
    default: `${sharedAssetsBasePath}/logo-animated.gif`,
    compact: `${sharedAssetsBasePath}/logo-animated-44.gif`,
  },
  icons: {
    app1024: `${sharedAssetsBasePath}/app-icon-1024.png`,
  },
};

export const brandMetadata = {
  accentColor: '#007AFF',
  assetSourceOfTruth: 'AudioFlow/Assets',
  usage: {
    primaryLogo: 'Use logo.svg on neutral or light surfaces.',
    transparentLogo: 'Use logo-transparent.svg where the background is already controlled by the host surface.',
    htmlBridge: 'Current no-build pages can consume these assets directly from /shared-assets/*.',
  },
};

export default brandAssets;
