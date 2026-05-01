-- Remove duplicate invoices, keep the oldest per contract
DELETE FROM public.invoices a
USING public.invoices b
WHERE a.contract_id = b.contract_id
  AND a.created_at > b.created_at;

-- Add unique constraint on contract_id (one invoice per contract)
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_contract_id_unique UNIQUE (contract_id);

-- Replace the trigger function: fire on completed, not active
CREATE OR REPLACE FUNCTION public.create_invoice_on_contract_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.invoices (contract_id, firm_id, amount_cents, due_date, status)
    VALUES (
      NEW.id,
      NEW.firm_id,
      NEW.total_value_cents,
      now() + interval '30 days',
      'pending'
    )
    ON CONFLICT (contract_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop the old trigger (if it exists) and create the new one
DROP TRIGGER IF EXISTS trg_create_invoice_on_contract_active ON public.contracts;
DROP TRIGGER IF EXISTS create_invoice_on_contract_active ON public.contracts;
DROP TRIGGER IF EXISTS trg_create_invoice_on_contract_completed ON public.contracts;

CREATE TRIGGER trg_create_invoice_on_contract_completed
AFTER UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.create_invoice_on_contract_completed();

-- Drop the old function (no longer used)
DROP FUNCTION IF EXISTS public.create_invoice_on_contract_active();