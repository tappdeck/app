# TAPDECK — NFC Sales OS

TAPDECK is a branded sales dashboard for an NFC business card company. It keeps one master CRM in Notion and turns the data into a focused view of enquiries, card orders, proposals, wins, and follow-ups.

## Required Notion property
Add a **Brands** property to the Master CRM as a **Multi-select**. Assign one or more brands to each lead. A lead assigned to multiple brands appears in each brand workspace.

The dashboard also reads:
- Lead Status
- Company
- Contact Person
- Email
- Phone Number
- NFC Product, Product, or Card Package
- Card Style or Finish
- Quantity, Order Quantity, or Card Quantity
- Deal Value, Quote Value, or Order Value
- Lead Source or Source
- Last Contacted
- Next action
- Qualified Date
- Proposal Sent Date
- Won Date
- Lost Date

## Environment variables
- NOTION_API_KEY
- NOTION_DATA_SOURCE_ID

Only the lead name and status are required. The product, order, value, and source fields are optional; the CRM uses clear fallbacks when they are not present.

## Deploy
Deploy the project to Netlify and keep the existing environment variables.
