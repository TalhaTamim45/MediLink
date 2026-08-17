import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base guidelines based on typical standard mobile screens (iPhone 11/12/13/14 size)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale width dimension based on screen width ratio.
 * Useful for horizontal sizing: widths, paddingHorizontal, marginHorizontal, left, right.
 */
export const scale = (size) => {
  if (Platform.OS === 'web' && SCREEN_WIDTH > 600) {
    return size; // Keep original desktop/web size to prevent stretching
  }
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / guidelineBaseWidth) * size);
};

/**
 * Scale height dimension based on screen height ratio.
 * Useful for vertical sizing: heights, paddingVertical, marginVertical, top, bottom.
 */
export const verticalScale = (size) => {
  if (Platform.OS === 'web' && SCREEN_WIDTH > 600) {
    return size;
  }
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / guidelineBaseHeight) * size);
};

/**
 * Scale sizing moderately (with a constraint factor).
 * Extremely useful for font sizes, border radii, and smaller gaps where proportional scaling
 * might make elements too large or too small.
 */
export const moderateScale = (size, factor = 0.5) => {
  if (Platform.OS === 'web' && SCREEN_WIDTH > 600) {
    return size;
  }
  return size + (scale(size) - size) * factor;
};

/**
 * Calculate dynamic width percentage.
 */
export const wp = (widthPercent) => {
  const elemWidth = typeof widthPercent === 'number' ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

/**
 * Calculate dynamic height percentage.
 */
export const hp = (heightPercent) => {
  const elemHeight = typeof heightPercent === 'number' ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
