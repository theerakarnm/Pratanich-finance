#!/bin/bash

API_URL="http://localhost:3000/api"

echo "Testing Client API..."

# Create Client
echo "Creating Client..."
RANDOM_ID=$(date +%s)
CLIENT_RESPONSE=$(curl -s -X POST "$API_URL/internal/clients" \
  -H "Content-Type: application/json" \
  -d "{
    \"citizen_id\": \"$RANDOM_ID\",
    \"title_name\": \"Mr.\",
    \"first_name\": \"John\",
    \"last_name\": \"Doe\",
    \"date_of_birth\": \"1990-01-01\",
    \"mobile_number\": \"0812345678\",
    \"email\": \"john.doe.$RANDOM_ID@example.com\",
    \"line_id\": \"johndoe_$RANDOM_ID\"
  }")
echo "Create Client Response: $CLIENT_RESPONSE"

CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.data.id')
echo "Client ID: $CLIENT_ID"

if [ "$CLIENT_ID" == "null" ] || [ "$CLIENT_ID" == "" ]; then
  echo "Failed to create client"
  exit 1
fi

# List Clients
echo "Listing Clients..."
curl -s "$API_URL/internal/clients" | jq .

echo "Testing Loan API..."

# Create Loan
echo "Creating Loan..."
LOAN_RESPONSE=$(curl -s -X POST "$API_URL/internal/loans" \
  -H "Content-Type: application/json" \
  -d "{
    \"contract_number\": \"LN-$RANDOM_ID\",
    \"client_id\": \"$CLIENT_ID\",
    \"loan_type\": \"Personal\",
    \"principal_amount\": 10000,
    \"approved_amount\": 10000,
    \"interest_rate\": 15,
    \"term_months\": 12,
    \"installment_amount\": 1000,
    \"contract_start_date\": \"$(date +%Y-%m-%d)\",
    \"contract_end_date\": \"$(date -v+1y +%Y-%m-%d)\",
    \"due_day\": 5,
    \"contract_status\": \"Active\",
    \"outstanding_balance\": 10000
  }")
echo "Create Loan Response: $LOAN_RESPONSE"

LOAN_ID=$(echo $LOAN_RESPONSE | jq -r '.data.id')
echo "Loan ID: $LOAN_ID"

if [ "$LOAN_ID" == "null" ] || [ "$LOAN_ID" == "" ]; then
  echo "Failed to create loan"
  exit 1
fi

# List Loans
echo "Listing Loans..."
curl -s "$API_URL/internal/loans" | jq .

echo "Verification Complete"
