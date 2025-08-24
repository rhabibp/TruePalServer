package com.newmotion.views

import kotlinx.html.*

fun BODY.transactionModal() {
    div {
        id = "transaction-modal"
        classes = setOf("modal")

        div {
            classes = setOf("modal-content", "large")

            // Header
            div {
                classes = setOf("modal-header")
                h2 {
                    id = "transaction-modal-title"
                    i { classes = setOf("fas", "fa-exchange-alt") }
                    +" New Transaction"
                }
                span {
                    classes = setOf("close")
                    +"×"
                }
            }

            // Body
            div {
                classes = setOf("modal-body")
                form {
                    id = "transaction-form"
                    autoComplete = false

                    div {
                        classes = setOf("transaction-grid")

                        // Left Column: Part Selection
                        div {
                            classes = setOf("transaction-col-left")

                            // Part Search Section
                            div {
                                classes = setOf("form-group")
                                label {
                                    htmlFor = "part-search"
                                    i { classes = setOf("fas", "fa-search") }
                                    +" Search for Parts"
                                }
                                div {
                                    classes = setOf("search-input-wrapper")
                                    input {
                                        type = InputType.text
                                        id = "part-search"
                                        placeholder = "Type part name, number, or description..."
                                        autoComplete = "off"
                                    }
                                    button {
                                        type = ButtonType.button
                                        id = "clear-search-btn"
                                        classes = setOf("clear-btn")
                                        +"×"
                                    }
                                }
                                div {
                                    id = "search-results"
                                    classes = setOf("search-results-list")
                                    // Search results will be populated by JavaScript
                                }
                            }

                            // Selected Parts Section
                            div {
                                classes = setOf("selected-parts-section")
                                div {
                                    classes = setOf("section-header")
                                    h3 {
                                        i { classes = setOf("fas", "fa-shopping-cart") }
                                        +" Selected Parts"
                                    }
                                }

                                // Selected parts container
                                div {
                                    id = "selected-parts"
                                    classes = setOf("selected-parts-list")
                                    // Will be populated by JavaScript
                                    div {
                                        classes = setOf("empty-selection")
                                        i { classes = setOf("fas", "fa-inbox") }
                                        p { +"No parts selected" }
                                        small {
                                            classes = setOf("text-muted")
                                            +"Search and add parts above"
                                        }
                                    }
                                }

                                // Summary row
                                div {
                                    classes = setOf("selected-parts-summary-row")
                                    span {
                                        id = "selected-parts-count"
                                        +"0 parts selected"
                                    }
                                    span {
                                        id = "selected-parts-total"
                                        +"Total: $0.00"
                                    }
                                }

                                // Error message
                                div {
                                    classes = setOf("part-selection-error")
                                    id = "selected-parts-error"
                                    +"Please select at least one part for the transaction."
                                }
                            }
                        }

                        // Right Column: Transaction Details
                        div {
                            classes = setOf("transaction-col-right")

                            // Transaction Type
                            div {
                                classes = setOf("form-group")
                                label {
                                    htmlFor = "transaction-type"
                                    i { classes = setOf("fas", "fa-exchange-alt") }
                                    +" Transaction Type *"
                                }
                                select {
                                    id = "transaction-type"
                                    required = true
                                    option {
                                        value = ""
                                        disabled = true
                                        selected = true
                                        +"Select type..."
                                    }
                                    option {
                                        value = "IN"
                                        +"Stock In"
                                    }
                                    option {
                                        value = "OUT"
                                        +"Stock Out"
                                    }
                                    option {
                                        value = "ADJUSTMENT"
                                        +"Stock Adjustment"
                                    }
                                }
                            }

                            // Recipient Name (shown only for OUT transactions)
                            div {
                                id = "recipient-group"
                                classes = setOf("form-group", "hidden")
                                label {
                                    htmlFor = "transaction-recipient"
                                    i { classes = setOf("fas", "fa-user") }
                                    +" Recipient Name *"
                                }
                                input {
                                    type = InputType.text
                                    id = "transaction-recipient"
                                    placeholder = "Enter recipient name"
                                }
                            }

                            // Reason
                            div {
                                classes = setOf("form-group")
                                label {
                                    htmlFor = "transaction-reason"
                                    i { classes = setOf("fas", "fa-comment") }
                                    +" Reason"
                                }
                                input {
                                    type = InputType.text
                                    id = "transaction-reason"
                                    placeholder = "e.g., Maintenance, Customer order, etc."
                                }
                            }

                            // Transaction Summary
                            div {
                                classes = setOf("transaction-summary")
                                h4 {
                                    i { classes = setOf("fas", "fa-calculator") }
                                    +" Summary"
                                }
                                div {
                                    id = "transaction-summary-details"
                                    +"Select parts to see transaction details"
                                }
                            }

                            // Payment Information
                            div {
                                classes = setOf("form-group")
                                label {
                                    htmlFor = "transaction-amount-paid"
                                    i { classes = setOf("fas", "fa-dollar-sign") }
                                    +" Amount Paid"
                                }
                                input {
                                    type = InputType.number
                                    id = "transaction-amount-paid"
                                    step = "0.01"
                                    min = "0"
                                    placeholder = "0.00"
                                    value = "0"
                                }
                            }

                            // Fully Paid Checkbox
                            div {
                                classes = setOf("form-group", "checkbox-group")
                                input {
                                    type = InputType.checkBox
                                    id = "transaction-is-paid"
                                }
                                label {
                                    htmlFor = "transaction-is-paid"
                                    +"Mark as Fully Paid"
                                }
                            }

                            // Notes
                            div {
                                classes = setOf("form-group")
                                label {
                                    htmlFor = "transaction-notes"
                                    i { classes = setOf("fas", "fa-sticky-note") }
                                    +" Additional Notes"
                                }
                                textArea {
                                    id = "transaction-notes"
                                    rows = "3"
                                    placeholder = "Add any relevant notes or special instructions..."
                                }
                            }
                        }
                    }
                }
            }

            // Footer
            div {
                classes = setOf("modal-footer")
                button {
                    type = ButtonType.button
                    id = "cancel-transaction"
                    classes = setOf("btn", "btn-secondary")
                    i { classes = setOf("fas", "fa-times") }
                    +" Cancel"
                }
                button {
                    type = ButtonType.submit
                    form = "transaction-form"
                    classes = setOf("btn", "btn-primary")
                    i { classes = setOf("fas", "fa-save") }
                    +" Save Transaction"
                }
            }
        }
    }
}