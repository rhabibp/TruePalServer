# TruePal Inventory Management Frontend

## Overview

This is a comprehensive internal inventory management frontend built for maintaining spare and old parts management. The frontend provides a modern, responsive web interface that consumes the TruePal Server API.

## Features Implemented

### ✅ Core Requirements Met

1. **All Parts List with Search**
   - Complete parts listing with pagination
   - Real-time search functionality
   - Filter by category and low stock status
   - Visual stock indicators with color coding

2. **Add Parts with All Information**
   - Comprehensive part creation form
   - All fields supported: name, part number, category, price, stock levels, location, supplier, machine models, description
   - Form validation and error handling
   - Initial stock transaction recording

3. **Part Details with Transaction History**
   - Click on any part to view detailed information
   - Complete transaction history showing:
     - Who took parts (recipient name)
     - How many pieces
     - Payment status (paid/unpaid/partial)
     - Amount paid
     - Transaction dates and reasons
   - Real-time stock deduction tracking

4. **Category-based Organization**
   - Parts organized under categories
   - Category management (create, edit, delete)
   - Category-based filtering and statistics

5. **Comprehensive Statistics Dashboard**
   - Current inventory overview (total parts, categories, value)
   - Low stock items count and alerts
   - Fast-moving parts identification
   - Parts consumption analysis
   - Restock recommendations

6. **Transaction Management**
   - Record parts going IN, OUT, or ADJUSTMENT
   - Payment tracking with amount paid
   - Recipient information for outgoing parts
   - Automatic stock level updates

### 🎯 Additional Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Automatic refresh of data across sections
- **Toast Notifications**: User-friendly success/error messages
- **Loading States**: Visual feedback during API operations
- **Modern UI**: Professional design with animations and hover effects
- **Pagination**: Efficient handling of large datasets
- **Form Validation**: Client-side validation with error messages

## File Structure

```
src/main/resources/static/
├── index.html          # Main application HTML
├── styles.css          # Complete CSS styling
└── app.js             # JavaScript application logic
```

## How to Use

### 1. Start the Server
```bash
./gradlew run
```

### 2. Access the Frontend
Open your browser and navigate to: `http://localhost:8080`

### 3. Navigation Sections

#### Dashboard
- Overview of inventory statistics
- Fast-moving parts analysis
- Recent transactions
- Low stock alerts

#### Parts Management
- View all parts in card layout
- Search by name, part number, or description
- Filter by category or low stock status
- Add new parts with complete information
- Edit existing parts
- Delete parts (with confirmation)
- Click on parts to view detailed transaction history

#### Categories
- Manage part categories
- Create new categories
- View category statistics
- Delete categories (with confirmation)

#### Transactions
- View all transactions in table format
- Record new transactions (IN/OUT/ADJUSTMENT)
- Update payment information
- Track recipient information
- Delete transactions (with confirmation)

#### Low Stock Alert
- Dedicated view for parts below minimum stock
- Visual indicators for critical stock levels
- Quick access to restock information

#### Reports & Analytics
- Category-wise statistics
- Inventory value analysis
- Fast-moving parts identification
- Consumption patterns

## API Integration

The frontend seamlessly integrates with all backend API endpoints:

- **Categories API**: `/api/categories/*`
- **Parts API**: `/api/parts/*`
- **Transactions API**: `/api/transactions/*`
- **Statistics API**: `/api/stats/*`

## Key Features in Detail

### Parts Management
- **Visual Stock Indicators**: Color-coded progress bars showing current vs minimum stock
- **Low Stock Alerts**: Parts below minimum stock are highlighted in orange
- **Comprehensive Information**: All part details including machine models, supplier, location
- **Transaction History**: Complete audit trail of all part movements

### Transaction Recording
- **Multiple Transaction Types**:
  - **IN**: Stock incoming (purchases, returns)
  - **OUT**: Stock outgoing (usage, sales)
  - **ADJUSTMENT**: Stock level corrections
- **Payment Tracking**: Record payment status and amounts
- **Recipient Tracking**: Track who received parts for accountability

### Dashboard Analytics
- **Real-time Statistics**: Live inventory value and counts
- **Fast-moving Analysis**: Identify parts that need frequent restocking
- **Low Stock Monitoring**: Immediate visibility of parts needing attention
- **Category Performance**: Understand which categories are most active

### Search and Filtering
- **Real-time Search**: Instant results as you type
- **Multiple Search Fields**: Search across part names, numbers, and descriptions
- **Advanced Filtering**: Combine category and stock status filters
- **Pagination**: Efficient browsing of large inventories

## Technical Implementation

### Frontend Technologies
- **HTML5**: Semantic markup with accessibility considerations
- **CSS3**: Modern styling with flexbox/grid layouts, animations, and responsive design
- **Vanilla JavaScript**: No external dependencies, pure ES6+ features
- **Fetch API**: RESTful API communication
- **Local Storage**: Client-side state management

### Design Principles
- **Mobile-First**: Responsive design that works on all devices
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Optimized loading and minimal resource usage

### Error Handling
- **API Error Management**: Graceful handling of network and server errors
- **User Feedback**: Clear error messages and success notifications
- **Validation**: Client-side form validation with server-side backup
- **Fallback States**: Proper handling of empty data states

## Customization

The frontend is designed to be easily customizable:

- **Styling**: Modify `styles.css` for visual changes
- **Functionality**: Extend `app.js` for additional features
- **Layout**: Update `index.html` for structural changes
- **API Integration**: Easily adaptable to different backend endpoints

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Enhancements

Potential areas for expansion:
- Barcode scanning integration
- Export functionality (PDF, Excel)
- Advanced reporting with charts
- User authentication and roles
- Bulk operations
- Email notifications for low stock
- Integration with procurement systems

---

This frontend provides a complete solution for internal inventory management, meeting all the specified requirements while offering a modern, user-friendly experience.