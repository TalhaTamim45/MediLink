/**
 * Order status constants and helper functions for MediLink Pharmacy App.
 */

export const ORDER_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const ACTIVE_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_DELIVERY,
];

export const COMPLETED_STATUSES = [
  ORDER_STATUS.DELIVERED,
];

export const CANCELLED_STATUSES = [
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REJECTED,
];

export const TERMINAL_STATUSES = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.CANCELLED,
];

/**
 * Valid transitions allowed in Pharmacy App:
 * Pending -> Accepted or Rejected
 * Accepted -> Preparing
 * Preparing -> Ready for Delivery
 * Ready for Delivery -> Delivered
 */
export const VALID_NEXT_STATUSES = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY_FOR_DELIVERY],
  [ORDER_STATUS.READY_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export function isValidStatusTransition(currentStatus, nextStatus) {
  const allowed = VALID_NEXT_STATUSES[currentStatus] || [];
  return allowed.includes(nextStatus);
}
