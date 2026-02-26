/**
 * Device Detection Utilities
 * 
 * Helpers to detect device type, OS version, and capabilities
 */

/**
 * Check if device is iPhone
 */
export function isIPhone(): boolean {
  if (typeof window === "undefined") return false;
  
  const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
  return /iPhone|iPod/.test(userAgent);
}

/**
 * Get iOS version from user agent
 */
export function getIOSVersion(): string | null {
  if (typeof window === "undefined") return null;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  
  if (match) {
    return `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ""}`;
  }
  
  return null;
}

/**
 * Check if iOS version meets minimum requirement
 */
export function isIOSVersionSupported(minVersion: string): boolean {
  const currentVersion = getIOSVersion();
  if (!currentVersion) return false;
  
  const minParts = minVersion.split(".").map(Number);
  const currentParts = currentVersion.split(".").map(Number);
  
  for (let i = 0; i < Math.max(minParts.length, currentParts.length); i++) {
    const min = minParts[i] || 0;
    const current = currentParts[i] || 0;
    
    if (current > min) return true;
    if (current < min) return false;
  }
  
  return true; // Versions are equal
}

/**
 * Check if device supports NFC (Tap to Pay)
 */
export function supportsNFC(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if device is iPhone XS or newer (required for Tap to Pay)
  const userAgent = window.navigator.userAgent;
  const isIPhoneXSOrNewer = /iPhone/.test(userAgent) && 
    !/iPhone[1-9]|iPhone X/.test(userAgent); // iPhone XS and newer
  
  return isIPhoneXSOrNewer;
}

/**
 * Check if device is ready for Tap to Pay
 */
export function isDeviceReadyForTapToPay(minIOSVersion: string = "16.0"): {
  isReady: boolean;
  isIPhone: boolean;
  iosVersion: string | null;
  isIOSSupported: boolean;
  supportsNFC: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const isIPhoneDevice = isIPhone();
  if (!isIPhoneDevice) {
    errors.push("Device is not an iPhone");
  }
  
  const iosVersion = getIOSVersion();
  if (!iosVersion) {
    errors.push("Could not detect iOS version");
  }
  
  const isIOSSupported = iosVersion ? isIOSVersionSupported(minIOSVersion) : false;
  if (iosVersion && !isIOSSupported) {
    errors.push(`iOS version ${iosVersion} is below minimum required ${minIOSVersion}`);
  }
  
  const hasNFC = supportsNFC();
  if (!hasNFC) {
    errors.push("Device does not support NFC (Tap to Pay requires iPhone XS or newer)");
  }
  
  const isReady = isIPhoneDevice && 
                  iosVersion !== null && 
                  isIOSSupported && 
                  hasNFC;
  
  return {
    isReady,
    isIPhone: isIPhoneDevice,
    iosVersion,
    isIOSSupported,
    supportsNFC: hasNFC,
    errors,
  };
}
