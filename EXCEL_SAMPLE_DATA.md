# Excel Sample Data for Student Import

## Format Requirements

The Excel file should have the following columns in order:

1. **First Name** - Text (required)
2. **Last Name** - Text (required)
3. **Roll Number** - Text (required, unique per class)
4. **Gender** - Text (required, must be: MALE, FEMALE, or OTHER)
5. **DOB** - Date (required, format: YYYY-MM-DD, e.g., 2010-05-15)
6. **Class** - Text (required, e.g., "10", "9", "1st", "Junior KG")
7. **Division** - Text (required, e.g., "A", "B", "C")
8. **Parent Name** - Text (required)
9. **Parent Mobile** - Text (required, exactly 10 digits, e.g., 9876543210)
10. **Parent Email** - Email (required, valid email format)

## Sample Data

Here's sample data you can use in your Excel file:

| First Name | Last Name | Roll Number | Gender | DOB | Class | Division | Parent Name | Parent Mobile | Parent Email |
|------------|-----------|-------------|--------|-----|-------|----------|-------------|---------------|--------------|
| John | Doe | 101 | MALE | 2010-05-15 | 10 | A | Jane Doe | 9876543210 | jane.doe@example.com |
| Mary | Smith | 102 | FEMALE | 2011-08-20 | 9 | B | John Smith | 9876543211 | john.smith@example.com |
| David | Johnson | 103 | MALE | 2012-03-10 | 8 | A | Sarah Johnson | 9876543212 | sarah.johnson@example.com |
| Emma | Williams | 104 | FEMALE | 2013-07-25 | 7 | C | Michael Williams | 9876543213 | michael.williams@example.com |
| James | Brown | 105 | MALE | 2014-11-12 | 6 | A | Lisa Brown | 9876543214 | lisa.brown@example.com |

## Important Notes

1. **Date Format**: Always use YYYY-MM-DD format (e.g., 2010-05-15, not 15/05/2010 or 05/15/2010)
2. **Class Format**: You can use simple numbers (e.g., "10", "9") or full format (e.g., "10th", "9th"). For Kindergarten, use "Junior KG" or "Senior KG"
3. **Division**: Use single letters (A, B, C) or short codes
4. **Parent Mobile**: Must be exactly 10 digits, no spaces or special characters
5. **Gender**: Must be exactly "MALE", "FEMALE", or "OTHER" (case-insensitive)
6. **Roll Number**: Must be unique within the same class and division

## Common Errors to Avoid

- ❌ Wrong date format: 15/05/2010, 05-15-2010
- ✅ Correct date format: 2010-05-15

- ❌ Parent mobile with spaces: 98765 43210
- ✅ Correct format: 9876543210

- ❌ Invalid email: jane@example, jane.example.com
- ✅ Correct format: jane.doe@example.com

- ❌ Class not created: Using "10" when class "10th A" doesn't exist
- ✅ Solution: Create the class first in the Classes management page

## Download Sample File

You can download a sample Excel file with proper formatting from the Bulk Import page by clicking "Download Sample .xlsx" button.
