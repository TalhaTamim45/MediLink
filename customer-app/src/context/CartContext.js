import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Helper to extract numeric price from string e.g., "৳25.00 / strip" -> 25
  const parsePrice = (priceStr) => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const match = priceStr.match(/৳?\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Add medicine to cart
  const addToCart = (itemPayload, defaultPharmacyName) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === itemPayload.id);
      const unitPrice = typeof itemPayload.unitPrice === 'number'
        ? itemPayload.unitPrice
        : parsePrice(itemPayload.price);

      const addQty = itemPayload.quantity || 1;

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + addQty,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            id: itemPayload.id || itemPayload.medicineId,
            medicineId: itemPayload.medicineId || itemPayload.id,
            pharmacyUid: itemPayload.pharmacyUid || '',
            pharmacyName: itemPayload.pharmacyName || defaultPharmacyName || 'MediLink Pharmacy',
            name: itemPayload.name || itemPayload.medicineName || 'Medicine',
            medicineName: itemPayload.medicineName || itemPayload.name || 'Medicine',
            genericName: itemPayload.genericName || itemPayload.generic || '',
            generic: itemPayload.generic || itemPayload.genericName || '',
            strength: itemPayload.strength || '',
            unitPrice: unitPrice,
            price: unitPrice,
            quantity: addQty,
            prescriptionRequired: !!itemPayload.prescriptionRequired,
          },
        ];
      }
    });
  };

  // Update item quantity (+1 or -1)
  const updateQuantity = (id, delta) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean); // Remove items with quantity 0
    });
  };

  // Remove single item from cart
  const removeFromCart = (id) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculated totals
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = cartItems.length > 0 ? 60 : 0;
  const grandTotal = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
        deliveryFee,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
