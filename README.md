## Tracer Study WhatsApp Broadcast System

A comprehensive Google Apps Script-based web application designed for vocational schools to manage alumni tracer study data and automate WhatsApp broadcast communications.

### Features

- **Data Management**
  - CSV/XLSX file upload and processing
  - Data synchronization with ministry tracer study database
  - Alumni contact information management
  - Phone number normalization (Indonesian format)

- **WhatsApp Broadcasting**
  - Template-based message system
  - Bulk messaging with rate limiting
  - Status tracking (KIRIM WA, TERKIRIM, STOP, GAGAL KIRIM)
  - Batch processing with progress monitoring

- **User Interface**
  - Unified web application with dual interfaces
  - Upload & synchronization page
  - Broadcast management dashboard
  - Mobile-responsive design

- **Administration Tools**
  - Google Sheets integration for direct access
  - Sidebar tools for quick operations
  - Menu-driven spreadsheet functions
  - Real-time data preview

### Technology Stack

- **Backend:** Google Apps Script
- **Frontend:** HTML5, CSS3, JavaScript
- **UI Framework:** Bootstrap 5.3.3
- **Icons:** Bootstrap Icons
- **Data Storage:** Google Sheets
- **File Processing:** Drive API
- **External API:** WhatsApp Gateway

### Prerequisites

- Google Workspace account
- WhatsApp API gateway service
- Google Sheets with specific structure
- Apps Script project permissions

### Installation

1. **Create Google Apps Script Project**
   ```
   1. Go to script.google.com
   2. Create new project
   3. Copy provided source code files
   ```

2. **Set Up Google Sheets**
   ```
   Required sheets:
   - BROADCAST (main data sheet)
   - DATA INTERNAL SEKOLAH (school internal data)
   - TEMPLATE TEKS BC (message templates)
   - NOTE (API configuration)
   ```

3. **Configure WhatsApp API**
   ```
   Update NOTE sheet with:
   - API Key (cell C4)
   - Sender ID (cell C5)
   - API URL (cell C6)
   - Web App URL (cell C10)
   ```

4. **Deploy Web Application**
   ```
   1. Apps Script Editor → Deploy → New deployment
   2. Type: Web app
   3. Execute as: Me
   4. Access: Anyone or specific users
   5. Copy deployment URL
   ```

### Usage

#### For Administrators (Google Sheets)

Access spreadsheet directly for:
- Menu-driven operations
- Sidebar upload tools
- Direct data manipulation
- Advanced configurations

#### For Users (Web Application)

**Upload & Sync Data:**
- Navigate to: `your-webapp-url?page=Upload`
- Upload CSV/XLSX files
- Preview data before processing
- Sync with internal school database

**Broadcast Management:**
- Navigate to: `your-webapp-url?page=Index`
- Select message templates
- Set broadcast filters
- Execute batch messaging
- Monitor delivery status

### File Structure

```
├── Code.gs                 # Main backend functions
├── Wrapper.html           # Navigation wrapper (optional)
├── Upload.html            # File upload interface
├── Index.html             # Broadcast management interface
└── README.md              # Documentation
```

### Configuration

#### Message Templates

Templates support dynamic placeholders:
- `<NAMA>` - Alumni name
- `<NISN>` - Student identification number
- `<KOMPETENSI>` - Competency field
- `<STATUS ISI>` - Completion status
- `<HARI>` - Current day
- `<TANGGAL>` - Current date
- `<JAM>` - Current time
- `<SALAM>` - Time-based greeting

#### Rate Limiting

Default settings:
- Minimum delay: 2 seconds
- Maximum delay: 6 seconds
- Batch size: 20 messages
- Maximum runtime: 4.5 minutes

### API Reference

#### Main Functions

- `processUpload(fileObj, options)` - Process uploaded files
- `getBroadcastData(page, pageSize)` - Retrieve paginated data
- `getTemplates()` - Get message templates
- `processBroadcast(rowId)` - Send single message
- `broadcast()` - Execute batch broadcast

#### Utility Functions

- `normalizePhoneTo62_(phone)` - Format phone numbers
- `preparePayload_(rows)` - Process data rows
- `sendWhatsAppNotification(number, message)` - Send WhatsApp message

### Security Considerations

- API keys stored in Google Sheets (consider Properties Service)
- Input validation for uploaded files
- Rate limiting to prevent API abuse
- User access control via Google Workspace

### Limitations

- Google Apps Script 6-minute execution limit
- Memory constraints for large files
- WhatsApp API rate limits
- Maximum 50MB total project size

### Troubleshooting

#### Common Issues

1. **Templates not loading**
   - Check TEMPLATE TEKS BC sheet exists
   - Verify data in cells D4:D7

2. **Upload failures**
   - File size limit (10MB recommended)
   - Check file format (CSV/XLSX only)
   - Verify BROADCAST sheet structure

3. **WhatsApp delivery failures**
   - Validate API credentials in NOTE sheet
   - Check phone number format (62xxx)
   - Verify API service status

4. **Performance issues**
   - Reduce batch size
   - Increase delays between messages
   - Process data in smaller chunks

### Contributing

1. Fork the repository
2. Create feature branch
3. Test thoroughly with sample data
4. Submit pull request with documentation

### License

MIT License - See LICENSE file for details

### Support

For issues and questions:
- Check troubleshooting section
- Review Google Apps Script documentation
- Contact system administrator

### Changelog

**v2.0.0**
- Unified web application interface
- Improved error handling
- Enhanced mobile responsiveness
- Better template management

**v1.0.0**
- Initial release
- Basic upload and broadcast functionality
- Google Sheets integration

---

**Note:** This system is specifically designed for Indonesian vocational schools participating in the Ministry of Education's tracer study program. Modify configurations as needed for other educational contexts.
