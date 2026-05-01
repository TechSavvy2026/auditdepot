
CREATE OR REPLACE FUNCTION public.create_invoice_on_contract_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes TO 'active'
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    -- Guard against duplicates
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE contract_id = NEW.id) THEN
      INSERT INTO public.invoices (contract_id, firm_id, amount_cents, due_date, status)
      VALUES (
        NEW.id,
        NEW.firm_id,
        NEW.total_value_cents,
        now() + interval '30 days',
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_invoice_on_contract_active
AFTER UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.create_invoice_on_contract_active();
