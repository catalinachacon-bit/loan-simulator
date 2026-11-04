const translations = {
    es: {
        language: "Idioma",
        intro: "Explora tus cuotas y planifica tu próximo préstamo.",
        formTitle: "Datos del préstamo",
        amount: "Monto del préstamo",
        rate: "Tasa de interés (%)",
        rateType: "Tipo de tasa",
        monthly: "Efectiva Mensual",
        annual: "Efectiva Anual",
        months: "Plazo en meses",
        calculate: "Calcular préstamo",
        results: "Resumen de tu préstamo",
        payment: "Cuota mensual",
        totalPaid: "Total pagado",
        totalInterest: "Total de intereses",
        decimals: "Valores con dos decimales, en la misma unidad monetaria del monto ingresado.",
        schedule: "Tabla de amortización",
        period: "Período",
        initialBalance: "Saldo inicial",
        installment: "Cuota",
        interest: "Interés",
        principal: "Abono a capital",
        finalBalance: "Saldo final",
        print: "Imprimir",
        pdf: "Exportar PDF",
        invalidAmount: "Ingresa un monto del préstamo mayor que cero.",
        invalidRate: "Ingresa una tasa de interés igual o mayor que cero.",
        invalidMonths: "Ingresa un plazo en meses que sea un número entero positivo.",
        invalidPayment: "No es posible calcular la cuota con estos valores.",
        overflow: "Los valores ingresados exceden la capacidad de cálculo.",
        pdfUnavailable: "No se cargaron las bibliotecas PDF. Comprueba tu conexión y recarga la página.",
        pdfFailed: "No se pudo generar el PDF. Inténtalo nuevamente.",
        printFailed: "No se pudo abrir la impresión. Usa la opción de imprimir del navegador."
    },
    en: {
        language: "Language",
        intro: "Explore your payments and plan your next loan.",
        formTitle: "Loan details",
        amount: "Loan amount",
        rate: "Interest rate (%)",
        rateType: "Rate type",
        monthly: "Effective Monthly",
        annual: "Effective Annual",
        months: "Term in months",
        calculate: "Calculate loan",
        results: "Your loan summary",
        payment: "Monthly payment",
        totalPaid: "Total paid",
        totalInterest: "Total interest",
        decimals: "Values use two decimal places and the same monetary unit as the entered amount.",
        schedule: "Amortization schedule",
        period: "Period",
        initialBalance: "Opening balance",
        installment: "Payment",
        interest: "Interest",
        principal: "Principal repayment",
        finalBalance: "Closing balance",
        print: "Print",
        pdf: "Export PDF",
        invalidAmount: "Enter a loan amount greater than zero.",
        invalidRate: "Enter an interest rate greater than or equal to zero.",
        invalidMonths: "Enter a positive whole number of months.",
        invalidPayment: "The payment cannot be calculated with these values.",
        overflow: "The entered values exceed the calculation capacity.",
        pdfUnavailable: "The PDF libraries did not load. Check your connection and reload the page.",
        pdfFailed: "The PDF could not be generated. Please try again.",
        printFailed: "Printing could not be opened. Use your browser's print option."
    }
};

const get = id => document.getElementById(id);
const form = get("loan-form");

let language = "es";
let errorKey = "";
let exportErrorKey = "";
let simulation = null;
let moneyFormatter;
let rateFormatter;

try {
    const saved = localStorage.getItem("loan-simulator-language");

    if (saved === "es" || saved === "en") {
        language = saved;
    }
} catch {
    // El almacenamiento no es indispensable.
}

const text = key => translations[language][key];
const money = value => moneyFormatter.format(value);

function showError(key, fieldId) {
    errorKey = key;
    get("error").textContent = key ? text(key) : "";

    if (fieldId) {
        const field = get(fieldId);

        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", "error");
        field.focus();
    }
}

function showExportError(key) {
    exportErrorKey = key;
    get("export-error").textContent = key ? text(key) : "";
}

// Los reportes utilizan los datos de la última simulación válida.
function reportDetails() {
    return [
        [text("amount"), money(simulation.amount)],
        [text("rate"), rateFormatter.format(simulation.rate) + " %"],
        [text("rateType"), text(simulation.rateType)],
        [text("months"), String(simulation.months)]
    ];
}

function renderResults() {
    get("schedule").replaceChildren();
    get("results").hidden = simulation === null;

    if (!simulation) {
        return;
    }

    const details = reportDetails();
    const detailIds = [
        "report-amount",
        "report-rate",
        "report-type",
        "report-months"
    ];

    detailIds.forEach((id, index) => {
        get(id).textContent = details[index][1];
    });

    get("monthly-payment").textContent = money(simulation.payment);
    get("total-paid").textContent = money(simulation.totalPaid);
    get("total-interest").textContent = money(simulation.totalInterest);

    const fragment = document.createDocumentFragment();

    simulation.rows.forEach(values => {
        const row = document.createElement("tr");

        values.forEach((value, index) => {
            const cell = document.createElement("td");

            cell.textContent = index === 0
                ? String(value)
                : money(value);

            row.appendChild(cell);
        });

        fragment.appendChild(row);
    });

    get("schedule").appendChild(fragment);
}

function applyLanguage() {
    document.documentElement.lang = language;
    get("language").value = language;

    const locale = language === "es" ? "es-CO" : "en-US";

    moneyFormatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    rateFormatter = new Intl.NumberFormat(locale, {
        maximumSignificantDigits: 15
    });

    document.querySelectorAll("[data-i18n]").forEach(element => {
        element.textContent = text(element.dataset.i18n);
    });

    showError(errorKey);
    showExportError(exportErrorKey);
    renderResults();
}

get("language").addEventListener("change", () => {
    language = get("language").value;

    try {
        localStorage.setItem("loan-simulator-language", language);
    } catch {
        // Se conserva el idioma durante esta sesión.
    }

    applyLanguage();
});

form.addEventListener("submit", event => {
    event.preventDefault();

    simulation = null;
    showError("");
    showExportError("");
    renderResults();

    form.querySelectorAll("[aria-invalid]").forEach(field => {
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
    });

    const amount = get("amount").valueAsNumber;
    const rate = get("rate").valueAsNumber;
    const months = get("months").valueAsNumber;
    const rateType = get("rate-type").value;

    if (!Number.isFinite(amount) || amount <= 0) {
        showError("invalidAmount", "amount");
        return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
        showError("invalidRate", "rate");
        return;
    }

    if (!Number.isSafeInteger(months) || months <= 0) {
        showError("invalidMonths", "months");
        return;
    }

    const decimalRate = rate / 100;

    const monthlyRate = rateType === "annual"
        ? Math.expm1(Math.log1p(decimalRate) / 12)
        : decimalRate;

    const payment = monthlyRate === 0
        ? amount / months
        : amount * (
            monthlyRate /
            -Math.expm1(-months * Math.log1p(monthlyRate))
        );

    if (!Number.isFinite(payment) || payment <= 0) {
        showError("invalidPayment");
        return;
    }

    let balance = amount;
    let totalPaid = 0;
    let totalInterest = 0;
    const rows = [];

    for (let period = 1; period <= months; period++) {
        const initialBalance = balance;
        const interest = initialBalance * monthlyRate;

        let principalPayment;
        let currentPayment;

        if (period === months) {
            principalPayment = initialBalance;
            currentPayment = principalPayment + interest;
            balance = 0;
        } else {
            principalPayment = Math.min(
                initialBalance,
                Math.max(0, payment - interest)
            );

            currentPayment = principalPayment + interest;
            balance = initialBalance - principalPayment;
        }

        totalPaid += currentPayment;
        totalInterest += interest;

        if (
            !Number.isFinite(totalPaid) ||
            !Number.isFinite(totalInterest)
        ) {
            showError("overflow");
            return;
        }

        rows.push([
            period,
            initialBalance,
            currentPayment,
            interest,
            principalPayment,
            balance
        ]);
    }

    simulation = {
        amount,
        rate,
        rateType,
        months,
        payment,
        totalPaid,
        totalInterest,
        rows
    };

    renderResults();
});

get("print-button").addEventListener("click", () => {
    if (!simulation) {
        return;
    }

    showExportError("");
    renderResults();

    try {
        window.print();
    } catch {
        showExportError("printFailed");
    }
});

get("pdf-button").addEventListener("click", () => {
    if (!simulation) {
        return;
    }

    showExportError("");

    if (
        !window.jspdf ||
        typeof window.jspdf.jsPDF !== "function"
    ) {
        showExportError("pdfUnavailable");
        return;
    }

    try {
        const doc = new window.jspdf.jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        if (typeof doc.autoTable !== "function") {
            showExportError("pdfUnavailable");
            return;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text("Loan Simulator", 14, 18);

        doc.autoTable({
            startY: 25,
            head: [[text("formTitle"), text("results")]],
            body: [
                ...reportDetails(),
                [text("payment"), money(simulation.payment)],
                [text("totalPaid"), money(simulation.totalPaid)],
                [text("totalInterest"), money(simulation.totalInterest)]
            ],
            theme: "striped",
            styles: {
                font: "helvetica",
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [37, 99, 235]
            },
            margin: {
                left: 14,
                right: 14
            }
        });

        const headingY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text(text("schedule"), 14, headingY);

        const columnKeys = [
            "period",
            "initialBalance",
            "installment",
            "interest",
            "principal",
            "finalBalance"
        ];

        doc.autoTable({
            startY: headingY + 5,
            head: [columnKeys.map(text)],
            body: simulation.rows.map(row =>
                row.map((value, index) =>
                    index === 0 ? String(value) : money(value)
                )
            ),
            theme: "striped",
            showHead: "everyPage",
            rowPageBreak: "avoid",
            styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 3,
                overflow: "linebreak",
                halign: "right"
            },
            columnStyles: {
                0: {
                    halign: "left",
                    cellWidth: 20
                }
            },
            headStyles: {
                fillColor: [37, 99, 235]
            },
            margin: {
                top: 14,
                bottom: 15,
                left: 14,
                right: 14
            }
        });

        doc.save("loan-simulation.pdf");
    } catch {
        showExportError("pdfFailed");
    }
});

applyLanguage();