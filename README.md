# Sunshine Project-2 🌟  
**A Robust Medicine E-Commerce Platform for Secure, Efficient, and Dynamic Online Pharmacy Management**

[Live Demo](https://healthbo-24d01.web.app)

---

## 🛠️ Key Features  

### **1. Authentication & Authorization**  
- **Secure Login & Registration** with **Firebase Authentication**.  
- Social login options with **Google** and **Facebook**.  
- **Role-Based Dashboards**:  
  - **Admin**:  
    - Full control over users, inventory, and reports.  
    - Manage sellers, products, and advertisements.  
    - Track **total revenue** and update seller **payment statuses** once payments are received.  
    - Can generate and export detailed sales and inventory reports.  
  - **Seller**:  
    - Can add, update, and manage their own medicines and inventory.  
    - View and download their own **sales reports** and **revenue status**.  
    - Request advertisements for their products.  
    - Track **payment status** for each product sold.  
  - **User**:  
    - Browse and purchase medicines.  
    - Manage their cart and view past orders with detailed invoices.  

### **2. Product & Inventory Management**  
- **Dynamic Stock Management**:  
  - Stock levels automatically update after purchases.  
  - Prevents users from purchasing out-of-stock items.  
- **CRUD Functionality**:  
  - Sellers can manage their product listings, while admins can oversee and moderate seller activities.  
  - Sellers can view their individual product sales and revenue status.  

### **3. Advertisement Management**  
- **Admin**:  
  - Can manage and display advertisements on banners across the site.  
  - Track the revenue generated through advertisements.  
- **Seller**:  
  - Can request advertisement space for their products.  
  - View the status of their advertisement requests.  

### **4. Cart & Checkout**  
- Dynamic cart that updates quantities and prices in real time.  
- Checkout process integrated with **Stripe Payment Gateway** for secure transactions.  
- Automatic invoice generation for each order.  

### **5. Reporting & Exports**  
- **Sales Reports**:  
  - Admins and sellers can generate and download detailed sales reports in **CSV** or **PDF** formats.  
  - Sellers can export their own sales and revenue history, including the payment status for each sale.  

### **6. Secure Transactions**  
- **JWT Authentication** for API security.  
- Role-based access control ensures sensitive operations are protected.  

### **7. Modern UI/UX**  
- Responsive and intuitive design powered by **Tailwind CSS**.  
- User-friendly dashboards for seamless navigation.  

---

## 🔧 Tech Stack  

### **Frontend**  
- **React.js**  
- **Tailwind CSS**  

### **Backend**  
- **Node.js**  
- **Express.js**  

### **Database**  
- **MongoDB**  

### **Authentication**  
- **Firebase Authentication**  
- **JSON Web Tokens (JWT)**  

### **Payment Integration**  
- **Stripe Payment Gateway**  

### **State Management**  
- **TanStack Query** for efficient data fetching and caching.  

---


