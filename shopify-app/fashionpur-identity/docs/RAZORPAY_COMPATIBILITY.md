# Razorpay Magic Checkout compatibility

## Current commitment

Fashionpur already uses Razorpay Magic Checkout. Phase 0 and Phase 1 make no
live-theme, checkout, or Razorpay configuration changes. No Razorpay SDK,
script, webhook, or Magic Checkout setting is removed, replaced, or injected.

## Supported relationship

The app can associate a verified app identity with a Shopify customer record
where Shopify customer-data approval is granted. It can read that customer's
Shopify order history after approval. This does not alter Razorpay payment,
Shopify discounts, or order creation.

## Required later regression test

In a non-payment test session: add product from product/cart pages; start the
existing Magic Checkout; apply/remove a valid Shopify discount; select address
and payment option; confirm no settings or order behaviour changed. Until
recorded, this app must not claim to authenticate a shopper into Razorpay or
native Shopify checkout.
