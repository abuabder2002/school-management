package com.school.fee.service;

import com.school.fee.entity.Fee;
import com.school.fee.entity.Payment;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class FeePaymentAllocation {

    public static final String TERM_1 = "TERM_1";
    public static final String TERM_2 = "TERM_2";
    public static final String TERM_3 = "TERM_3";
    public static final String BUS_FEE = "BUS_FEE";
    public static final String EXAM_FEE = "EXAM_FEE";

    private static final List<String> COMPONENT_ORDER = List.of(TERM_1, TERM_2, TERM_3, BUS_FEE, EXAM_FEE);

    private FeePaymentAllocation() {
    }

    public static Summary calculate(Fee fee, List<Payment> payments) {
        Map<String, BigDecimal> amounts = componentAmounts(fee);
        Map<String, BigDecimal> paid = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String component : COMPONENT_ORDER) {
            paid.put(component, BigDecimal.ZERO);
            counts.put(component, 0);
        }

        Map<Payment, String> inferredComponents = new IdentityHashMap<>();
        List<Payment> chronologicalPayments = new ArrayList<>(payments == null ? List.of() : payments);
        chronologicalPayments.sort(Comparator
                .comparing(Payment::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(Payment::getPaymentDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(Payment::getId, Comparator.nullsFirst(Comparator.naturalOrder())));

        for (Payment payment : chronologicalPayments) {
            if (payment == null || payment.getAmountPaid() == null || payment.getAmountPaid().signum() <= 0) {
                continue;
            }
            String requestedComponent = normalizeComponent(payment.getFeeComponent());
            if (requestedComponent != null && amounts.get(requestedComponent).signum() > 0) {
                BigDecimal applied = applyToComponent(requestedComponent, payment.getAmountPaid(), amounts, paid);
                if (applied.signum() > 0) {
                    counts.compute(requestedComponent, (key, count) -> count + 1);
                    inferredComponents.put(payment, requestedComponent);
                }
                continue;
            }

            BigDecimal remainingPayment = payment.getAmountPaid();
            List<String> appliedComponents = new ArrayList<>();
            for (String component : COMPONENT_ORDER) {
                BigDecimal applied = applyToComponent(component, remainingPayment, amounts, paid);
                if (applied.signum() > 0) {
                    counts.compute(component, (key, count) -> count + 1);
                    appliedComponents.add(component);
                    remainingPayment = remainingPayment.subtract(applied);
                }
                if (remainingPayment.signum() <= 0) {
                    break;
                }
            }
            if (appliedComponents.size() == 1) {
                inferredComponents.put(payment, appliedComponents.get(0));
            } else if (appliedComponents.size() > 1) {
                inferredComponents.put(payment, "MULTIPLE");
            }
        }

        String currentComponent = null;
        for (String component : COMPONENT_ORDER) {
            if (amounts.get(component).compareTo(paid.get(component)) > 0) {
                currentComponent = component;
                break;
            }
        }
        if (currentComponent == null) {
            for (String component : COMPONENT_ORDER) {
                if (amounts.get(component).signum() > 0) {
                    currentComponent = component;
                }
            }
        }

        BigDecimal currentAmount = currentComponent == null ? BigDecimal.ZERO : amounts.get(currentComponent);
        BigDecimal currentPaid = currentComponent == null ? BigDecimal.ZERO : paid.get(currentComponent);
        BigDecimal currentOutstanding = currentAmount.subtract(currentPaid).max(BigDecimal.ZERO);
        Map<String, BigDecimal> outstanding = new LinkedHashMap<>();
        for (String component : COMPONENT_ORDER) {
            outstanding.put(component, amounts.get(component).subtract(paid.get(component)).max(BigDecimal.ZERO));
        }
        return new Summary(currentComponent, currentAmount, currentPaid, currentOutstanding,
            paid, outstanding, counts, inferredComponents);
    }

    public static String resolveComponent(String requestedComponent, Summary summary) {
        String normalized = normalizeComponent(requestedComponent);
        return normalized != null ? normalized : summary.currentComponent();
    }

    public static String normalizeComponent(String component) {
        return normalize(component);
    }

    public static String validatePayment(String component, BigDecimal amount, Summary summary) {
        if (component == null || !COMPONENT_ORDER.contains(component)) {
            return "Select a billed term or fee before recording this payment.";
        }
        if (amount == null || amount.signum() <= 0) {
            return "Payment amount must be greater than zero.";
        }

        BigDecimal outstanding = summary.outstanding(component);
        if (outstanding.signum() <= 0) {
            return label(component) + " is already fully paid.";
        }
        if (amount.compareTo(outstanding) > 0) {
            return "Payment cannot exceed outstanding balance (₹" + currency(outstanding) + ").";
        }
        return null;
    }

    private static String currency(BigDecimal amount) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.forLanguageTag("en-IN"));
        format.setMinimumFractionDigits(2);
        format.setMaximumFractionDigits(2);
        return format.format(amount);
    }

    public static String label(String component) {
        return switch (component) {
            case TERM_1 -> "Term 1 Fees";
            case TERM_2 -> "Term 2 Fees";
            case TERM_3 -> "Term 3 Fees";
            case BUS_FEE -> "Bus Fees";
            case EXAM_FEE -> "Exam Fees";
            case "MULTIPLE" -> "Multiple Fee Components";
            default -> "Fee Component";
        };
    }

    private static Map<String, BigDecimal> componentAmounts(Fee fee) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        amounts.put(TERM_1, value(fee.getTermFees1()));
        amounts.put(TERM_2, value(fee.getTermFees2()));
        amounts.put(TERM_3, value(fee.getTermFees3()));
        amounts.put(BUS_FEE, value(fee.getBusFees()));
        amounts.put(EXAM_FEE, value(fee.getExamFees()));
        return amounts;
    }

    private static BigDecimal applyToComponent(String component, BigDecimal amount,
                                              Map<String, BigDecimal> amounts, Map<String, BigDecimal> paid) {
        BigDecimal capacity = amounts.get(component).subtract(paid.get(component)).max(BigDecimal.ZERO);
        BigDecimal applied = amount.min(capacity);
        if (applied.signum() > 0) {
            paid.put(component, paid.get(component).add(applied));
        }
        return applied;
    }

    private static BigDecimal value(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount.max(BigDecimal.ZERO);
    }

    private static String normalize(String component) {
        if (component == null || component.isBlank() || "AUTO".equalsIgnoreCase(component)) {
            return null;
        }
        String clean = component.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (clean.equals("TERM1") || clean.equals("TERM1FEES")) return TERM_1;
        if (clean.equals("TERM2") || clean.equals("TERM2FEES")) return TERM_2;
        if (clean.equals("TERM3") || clean.equals("TERM3FEES")) return TERM_3;
        if (clean.equals("BUS") || clean.equals("BUSFEE") || clean.equals("BUSFEES")) return BUS_FEE;
        if (clean.equals("EXAM") || clean.equals("EXAMFEE") || clean.equals("EXAMFEES")) return EXAM_FEE;
        return null;
    }

    public record Summary(String currentComponent, BigDecimal currentAmount, BigDecimal currentPaid,
                          BigDecimal currentOutstanding, Map<String, BigDecimal> paidByComponent,
                          Map<String, BigDecimal> outstandingByComponent,
                          Map<String, Integer> paymentCounts, Map<Payment, String> inferredComponents) {
        public BigDecimal outstanding(String component) {
            return outstandingByComponent.getOrDefault(component, BigDecimal.ZERO);
        }

        public int paymentCount(String component) {
            return paymentCounts.getOrDefault(component, 0);
        }

        public String inferredComponent(Payment payment) {
            return inferredComponents.get(payment);
        }
    }
}