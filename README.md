# MediLink Platform 🏥💊

> **A Comprehensive Healthcare & Digital Pharmacy Ecosystem**  
> Streamlining medicine search, prescription verification, order fulfillment, and administrative oversight across Bangladesh.

---

## 🌟 Overview

**MediLink** is an end-to-end digital healthcare and pharmacy management system designed to connect customers, registered local pharmacies, and platform administrators seamlessly. The platform addresses critical challenges in healthcare delivery, including prescription review, medicine availability, instant quotation, real-time order tracking, and inventory control.

---

## 📁 Repository Structure

MediLink is organized as a multi-application repository containing the following core modules:

```text
MediLink/
├── customer-app/                     # Mobile App for Patients/Customers (Expo / React Native)
├── pharmacy-app/                     # Mobile App for Pharmacy Owners & Pharmacists (Expo / React Native)
├── admin-dashboard/                  # Web Dashboard for System Super-Admins (React / Vite)
├── shared/                           # Shared models, utilities, and constants
├── docs/                             # Architecture specs and technical documentation
└── stitch_medilink_design_system/    # UI Design System & Component Assets
```

---

## 📱 Component Applications

### 1. 🛒 Customer Mobile App (`customer-app`)
Built with **React Native (Expo)**, offering a smooth experience for users seeking medical services:
- **Medicine Search & Discovery**: Search brand and generic medications with real-time stock indicators.
- **Prescription Upload & Review**: Securely upload prescription images for review by licensed pharmacists.
- **Live Location & Nearby Pharmacies**: Integrated map view (Barikoi API / React Native Maps) to locate operational pharmacies.
- **Instant Quotation Review**: Receive itemized price quotes from nearby pharmacies before placing orders.
- **Real-Time Order Tracking**: Track fulfillment status from quotation to home delivery with OTP verification.

### 2. 🏪 Pharmacy Owner App (`pharmacy-app`)
Designed for retail pharmacy operators to manage operations efficiently:
- **Prescription Verification**: Inspect uploaded prescriptions and issue customized digital quotations.
- **Inventory Control**: Real-time stock status management, low-stock alerts, and price updates.
- **Order Fulfillment Workflow**: Transition orders from confirmation to packing and delivery dispatch.
- **Customer Chat & Support**: Built-in direct communication channel with customers.
- **Earnings & Analytics**: Track daily sales, completed payouts, and fulfillment efficiency.

### 3. 🛡️ Super-Admin Dashboard (`admin-dashboard`)
Built with **React, Vite, and Tailwind CSS**:
- **Platform Analytics**: Comprehensive view of active orders, daily platform GMV, and fulfillment metrics.
- **Pharmacy Verification & Onboarding**: Review license credentials and approve new pharmacy partners.
- **Prescription Audit Trail**: Oversee compliance and prescription verification standards.
- **Clinical & Operational Efficiency**: Monitor system health, delivery success rates, and customer feedback.

---

## 🛠️ Tech Stack & Dependencies

| Area | Technologies Used |
| :--- | :--- |
| **Mobile Framework** | [React Native](https://reactnative.dev/) (v0.86) with [Expo](https://expo.dev/) (v57) |
| **Web Framework** | [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) |
| **Backend & Cloud** | [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage) |
| **Maps & Location** | Barikoi Maps API, `react-native-maps`, `expo-location` |
| **Icons & Design** | `@expo/vector-icons`, `lucide-react`, Custom Design System |
| **State & Storage** | React Hooks, `@react-native-async-storage/async-storage` |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **Expo Go** app on iOS/Android (for testing mobile apps) or Android Studio / Xcode emulators

---

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TalhaTamim45/MediLink.git
   cd MediLink
   ```

2. **Setup Customer App**:
   ```bash
   cd customer-app
   npm install
   # Create .env from example
   cp .env.example .env
   # Start the app
   npm run start
   ```

3. **Setup Pharmacy App**:
   ```bash
   cd ../pharmacy-app
   npm install
   cp .env.example .env
   npm run start
   ```

4. **Setup Admin Dashboard**:
   ```bash
   cd ../admin-dashboard
   npm install
   npm run dev
   ```

---

## 🔒 Environment Variables

Each sub-application requires appropriate environment variables. Sample `.env.example` files are provided in each app folder:

- `EXPO_PUBLIC_BARIKOI_API_KEY`: API key for location and map services in Bangladesh.
- Firebase credentials configuration for backend connection.

*Note: Never commit `.env` files containing live secrets to public repositories.*

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
