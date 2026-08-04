import { isValidCoord } from '../components/BarikoiCustomerMap';

/**
 * Checks if a pharmacy document qualifies for visibility across customer-app screens:
 * Must have approvalStatus === "approved" and valid finite coordinates.
 * Does NOT require isOpen === true.
 */
export function isApprovedPharmacy(p) {
  if (!p) return false;
  if (p.approvalStatus !== 'approved') return false;
  return isValidCoord(p.latitude, p.longitude);
}

/**
 * Validates whether deliveryRadius is a positive finite number.
 * Missing, 0, negative, or NaN radii are invalid.
 */
export function isValidDeliveryRadius(radius) {
  const r = Number(radius);
  return Number.isFinite(r) && r > 0;
}

/**
 * Calculates delivery availability status for a pharmacy card:
 * - dist: calculated distance in km (or null if customer location unavailable)
 * - deliveryRadius: pharmacy.deliveryRadius
 */
export function getDeliveryStatus(dist, deliveryRadius) {
  const hasRadius = isValidDeliveryRadius(deliveryRadius);
  const radiusNum = hasRadius ? Number(deliveryRadius) : null;

  if (dist == null) {
    return {
      statusText: 'Location Needed to Check Delivery',
      isDeliverable: false,
      hasRadius,
      radiusNum,
      badgeType: 'info',
    };
  }

  if (!hasRadius) {
    return {
      statusText: 'Delivery Radius Not Set',
      isDeliverable: false,
      hasRadius: false,
      radiusNum: null,
      badgeType: 'warning',
    };
  }

  if (dist <= radiusNum) {
    return {
      statusText: 'Delivery Available',
      isDeliverable: true,
      hasRadius: true,
      radiusNum,
      badgeType: 'success',
    };
  }

  return {
    statusText: 'Outside Delivery Area',
    isDeliverable: false,
    hasRadius: true,
    radiusNum,
    badgeType: 'danger',
  };
}

/**
 * Formats distance text nicely e.g. "0.8 km away", "14.2 km away", "10,000+ km away"
 */
export function formatDistanceText(dist) {
  if (dist == null || isNaN(dist)) return null;
  if (dist >= 10000) return '10,000+ km away';
  return `${dist.toFixed(1)} km away`;
}
