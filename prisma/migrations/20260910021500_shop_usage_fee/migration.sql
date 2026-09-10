-- Shop-wide parlor usage fee (percent of artist usage of space/products).
-- Not Inkdesk SaaS billing and not a Stripe Connect application fee.
ALTER TABLE "Shop" ADD COLUMN "usageFeePercent" DECIMAL(5,1) NOT NULL DEFAULT 0;
