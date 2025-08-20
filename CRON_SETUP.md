# YesLocker Cron Jobs Configuration

## Overview
The YesLocker system requires two scheduled tasks:
1. **Voucher Auto-Expiry**: Runs every 5 minutes to mark expired vouchers
2. **Unused Locker Check**: Runs daily to create reminders for lockers unused for 3+ months

## Cron Endpoints

### 1. Voucher Auto-Expiry
- **Endpoint**: `POST https://yeslocker-web-production-314a.up.railway.app/api/cron/expire-vouchers`
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Purpose**: Updates vouchers that have exceeded their 30-minute validity period

### 2. Unused Locker Check
- **Endpoint**: `POST https://yeslocker-web-production-314a.up.railway.app/api/cron/check-unused-lockers`
- **Schedule**: Daily at 2 AM (`0 2 * * *`)
- **Purpose**: Creates reminders for lockers with no activity in 3 months

## Security Configuration

### Setting up CRON_TOKEN
1. Generate a secure token:
   ```bash
   openssl rand -hex 32
   ```

2. Add to Railway environment variables:
   ```
   CRON_TOKEN=your_generated_token_here
   ```

3. Include in cron requests:
   ```bash
   curl -X POST https://your-app.railway.app/api/cron/expire-vouchers \
     -H "x-cron-token: your_generated_token_here"
   ```

## Configuration Options

### Option 1: Using cron-job.org (Free)

1. Sign up at https://cron-job.org
2. Create a new cron job:
   - **Title**: YesLocker Voucher Expiry
   - **URL**: `https://yeslocker-web-production-314a.up.railway.app/api/cron/expire-vouchers`
   - **Schedule**: Every 5 minutes
   - **Method**: POST
   - **Headers**: Add `x-cron-token: your_token`

3. Create second cron job:
   - **Title**: YesLocker Unused Check
   - **URL**: `https://yeslocker-web-production-314a.up.railway.app/api/cron/check-unused-lockers`
   - **Schedule**: Daily at 2 AM
   - **Method**: POST
   - **Headers**: Add `x-cron-token: your_token`

### Option 2: Using Railway Cron (Premium)

Railway doesn't have built-in cron, but you can deploy a separate cron service:

1. Create a new service in your Railway project
2. Deploy this simple Node.js cron service:

```javascript
// cron-service.js
const cron = require('node-cron');
const axios = require('axios');

const API_URL = process.env.API_URL || 'https://yeslocker-web-production-314a.up.railway.app';
const CRON_TOKEN = process.env.CRON_TOKEN;

// Every 5 minutes - expire vouchers
cron.schedule('*/5 * * * *', async () => {
  try {
    await axios.post(`${API_URL}/api/cron/expire-vouchers`, {}, {
      headers: { 'x-cron-token': CRON_TOKEN }
    });
    console.log('Voucher expiry cron executed');
  } catch (error) {
    console.error('Voucher expiry cron failed:', error.message);
  }
});

// Daily at 2 AM - check unused lockers
cron.schedule('0 2 * * *', async () => {
  try {
    await axios.post(`${API_URL}/api/cron/check-unused-lockers`, {}, {
      headers: { 'x-cron-token': CRON_TOKEN }
    });
    console.log('Unused locker check executed');
  } catch (error) {
    console.error('Unused locker check failed:', error.message);
  }
});

console.log('Cron service started');
```

3. Package.json for the cron service:
```json
{
  "name": "yeslocker-cron",
  "version": "1.0.0",
  "scripts": {
    "start": "node cron-service.js"
  },
  "dependencies": {
    "node-cron": "^3.0.3",
    "axios": "^1.6.2"
  }
}
```

### Option 3: Using GitHub Actions (Free)

Create `.github/workflows/cron.yml`:

```yaml
name: YesLocker Cron Jobs

on:
  schedule:
    # Every 5 minutes
    - cron: '*/5 * * * *'
    # Daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  expire-vouchers:
    if: github.event.schedule == '*/5 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Expire Vouchers
        run: |
          curl -X POST https://yeslocker-web-production-314a.up.railway.app/api/cron/expire-vouchers \
            -H "x-cron-token: ${{ secrets.CRON_TOKEN }}"

  check-unused:
    if: github.event.schedule == '0 2 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Check Unused Lockers
        run: |
          curl -X POST https://yeslocker-web-production-314a.up.railway.app/api/cron/check-unused-lockers \
            -H "x-cron-token: ${{ secrets.CRON_TOKEN }}"
```

## Testing Cron Endpoints

### Manual Test Commands

Test voucher expiry:
```bash
curl -X POST https://yeslocker-web-production-314a.up.railway.app/api/cron/expire-vouchers \
  -H "x-cron-token: your_token_here"
```

Test unused locker check:
```bash
curl -X POST https://yeslocker-web-production-314a.up.railway.app/api/cron/check-unused-lockers \
  -H "x-cron-token: your_token_here"
```

## Monitoring

### Expected Responses

Successful voucher expiry:
```json
{
  "success": true,
  "message": "Expired 3 vouchers",
  "expired_count": 3,
  "timestamp": "2024-01-19T15:00:00.000Z"
}
```

Successful unused check:
```json
{
  "success": true,
  "message": "Checked unused lockers and created 2 reminders",
  "unused_lockers_count": 5,
  "new_reminders_count": 2,
  "reminders": [...],
  "timestamp": "2024-01-19T02:00:00.000Z"
}
```

### Logging

Check Railway logs for cron execution:
```bash
railway logs
```

Look for:
- `✅ Cron: Expired X vouchers at...`
- `✅ Cron: Created X reminders for unused lockers at...`

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check CRON_TOKEN matches in environment and request
2. **500 Error**: Check database connection and table existence
3. **No vouchers expiring**: Verify vouchers exist with `expires_at < NOW()`
4. **No reminders created**: Check if lockers have recent activity in locker_records

### Database Verification

Check voucher status:
```sql
SELECT status, COUNT(*) 
FROM vouchers 
GROUP BY status;
```

Check reminder creation:
```sql
SELECT * 
FROM reminders 
WHERE reminder_type = 'unused_3_months'
ORDER BY created_at DESC;
```

## Performance Notes

- Voucher expiry is lightweight, safe to run every 5 minutes
- Unused locker check is more intensive, run once daily during low-traffic hours
- Both endpoints use database transactions for consistency
- Indexes are created on relevant columns for performance

## Future Improvements

1. Add email/SMS notifications for reminders
2. Implement retry logic for failed cron executions
3. Add monitoring dashboard for cron job health
4. Consider using a message queue for better reliability