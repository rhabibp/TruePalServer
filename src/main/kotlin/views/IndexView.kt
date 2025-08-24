package com.newmotion.views

import kotlinx.html.*


fun HTML.index() {
    head {
        meta { charset = "UTF-8" }
        meta { name = "viewport"; content = "width=device-width, initial-scale=1.0" }
        title { +"TruePal Inventory Management" }
        link { rel = "stylesheet"; href = "/static/styles.css" }
        link {
            href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
            rel = "stylesheet"
        }
    }
    body {
        div(classes = "app-container") {
            // Sidebar Navigation
            nav(classes = "sidebar") {
                div(classes = "sidebar-header") {
                    h2 { i(classes = "fas fa-boxes") { +" TruePal Inventory" } }
                }
                ul(classes = "nav-menu") {
                    li { a(classes = "nav-link active") { attributes["data-section"] = "dashboard"; i(classes = "fas fa-tachometer-alt") { +" Dashboard" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "parts"; i(classes = "fas fa-cogs") { +" Parts" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "categories"; i(classes = "fas fa-tags") { +" Categories" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "transactions"; i(classes = "fas fa-exchange-alt") { +" Transactions" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "invoices"; i(classes = "fas fa-file-invoice") { +" Invoices" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "low-stock"; i(classes = "fas fa-exclamation-triangle") { +" Low Stock" } } }
                    li { a(classes = "nav-link") { attributes["data-section"] = "reports"; i(classes = "fas fa-chart-bar") { +" Reports" } } }
                }
            }

            // Main Content
            main(classes = "main-content") {
                header(classes = "top-header") {
                    div(classes = "header-left") {
                        button(classes = "mobile-menu-toggle") { id = "mobile-menu-toggle"; i(classes = "fas fa-bars") }
                        h1 { id = "page-title"; +"Dashboard" }
                    }
                    div(classes = "header-actions") {
                        button(classes = "btn btn-primary") { id = "add-part-btn"; i(classes = "fas fa-plus") { +" Add Part" } }
                        button(classes = "btn btn-secondary") { id = "refresh-btn"; i(classes = "fas fa-sync-alt") { +" Refresh" } }
                    }
                }

                // Dashboard Section
                section(classes = "content-section active") {
                    id = "dashboard-section"
                    div(classes = "stats-grid") {
                        div(classes = "stat-card") {
                            div(classes = "stat-icon") { i(classes = "fas fa-boxes") }
                            div(classes = "stat-info") {
                                h3 { id = "total-parts"; +"0" }
                                p { +"Total Parts" }
                            }
                        }
                        div(classes = "stat-card") {
                            div(classes = "stat-icon") { i(classes = "fas fa-tags") }
                            div(classes = "stat-info") {
                                h3 { id = "total-categories"; +"0" }
                                p { +"Categories" }
                            }
                        }
                        div(classes = "stat-card") {
                            div(classes = "stat-icon") { i(classes = "fas fa-dollar-sign") }
                            div(classes = "stat-info") {
                                h3 { id = "total-value"; +"$0" }
                                p { +"Total Value" }
                            }
                        }
                        div(classes = "stat-card warning") {
                            div(classes = "stat-icon") { i(classes = "fas fa-exclamation-triangle") }
                            div(classes = "stat-info") {
                                h3 { id = "low-stock-count"; +"0" }
                                p { +"Low Stock Items" }
                            }
                        }
                    }
                    div(classes = "dashboard-grid") {
                        div(classes = "dashboard-card") {
                            h3 { +"Fast Moving Parts" }
                            div(classes = "list-container") { id = "fast-moving-parts" }
                        }
                        div(classes = "dashboard-card") {
                            h3 { +"Recent Transactions" }
                            div(classes = "list-container") { id = "recent-transactions" }
                        }
                    }
                }

                // Parts Section
                section(classes = "content-section") {
                    id = "parts-section"
                    div(classes = "section-header") {
                        div(classes = "search-filters-enhanced") {
                            div(classes = "search-row-primary") {
                                input(type = InputType.text, classes = "search-input-enhanced") {
                                    id = "parts-search"
                                    placeholder = "Search by name, part number, description, supplier, location, or machine model..."
                                }
                                button(classes = "btn btn-secondary") { id = "clear-parts-filters"; i(classes = "fas fa-times") { +" Clear" } }
                            }
                            div(classes = "search-row-secondary") {
                                select(classes = "filter-select") {
                                    id = "category-filter"
                                    option { value = ""; +"All Categories" }
                                }
                                select(classes = "filter-select") {
                                    id = "supplier-filter"
                                    option { value = ""; +"All Suppliers" }
                                }
                                select(classes = "filter-select") {
                                    id = "location-filter"
                                    option { value = ""; +"All Locations" }
                                }
                                select(classes = "filter-select") {
                                    id = "stock-status-filter"
                                    option { value = ""; +"All Stock Levels" }
                                    option { value = "low"; +"Low Stock" }
                                    option { value = "critical"; +"Critical Stock" }
                                    option { value = "good"; +"Good Stock" }
                                    option { value = "overstocked"; +"Overstocked" }
                                }
                                div(classes = "price-range-filter") {
                                    input(type = InputType.number, classes = "price-input") {
                                        id = "price-min"
                                        placeholder = "Min Price"
                                        step = "0.01"
                                    }
                                    span(classes = "price-separator") { +"- " }
                                    input(type = InputType.number, classes = "price-input") {
                                        id = "price-max"
                                        placeholder = "Max Price"
                                        step = "0.01"
                                    }
                                }
                            }
                            div(classes = "search-row-tertiary") {
                                label(classes = "checkbox-label") {
                                    input(type = InputType.checkBox) { id = "has-machine-models-filter" }
                                    +" Has Machine Models"
                                }
                                label(classes = "checkbox-label") {
                                    input(type = InputType.checkBox) { id = "has-description-filter" }
                                    +" Has Description"
                                }
                                label(classes = "checkbox-label") {
                                    input(type = InputType.checkBox) { id = "recently-updated-filter" }
                                    +" Recently Updated (7 days)"
                                }
                            }
                        }
                    }
                    div(classes = "parts-grid") { id = "parts-grid" }
                    div(classes = "pagination") { id = "parts-pagination" }
                }

                // Categories Section
                section(classes = "content-section") {
                    id = "categories-section"
                    div(classes = "section-header") {
                        button(classes = "btn btn-primary") { id = "add-category-btn"; i(classes = "fas fa-plus") { +" Add Category" } }
                    }
                    div(classes = "categories-grid") { id = "categories-grid" }
                }

                // Transactions Section
                section(classes = "content-section") {
                    id = "transactions-section"
                    div(classes = "section-header") {
                        div(classes = "transaction-filters") {
                            input(type = InputType.text, classes = "search-input") {
                                id = "transaction-search"
                                placeholder = "Search by recipient, part, reason..."
                            }
                            select(classes = "filter-select") {
                                id = "transaction-type-filter"
                                option { value = ""; +"All Types" }
                                option { value = "IN"; +"Stock In" }
                                option { value = "OUT"; +"Stock Out" }
                                option { value = "ADJUSTMENT"; +"Adjustment" }
                            }
                            select(classes = "filter-select") {
                                id = "transaction-payment-filter"
                                option { value = ""; +"All Payments" }
                                option { value = "paid"; +"Paid" }
                                option { value = "unpaid"; +"Unpaid" }
                                option { value = "partial"; +"Partial" }
                            }
                            input(type = InputType.date, classes = "date-input") {
                                id = "transaction-date-from"
                                title = "From Date"
                            }
                            input(type = InputType.date, classes = "date-input") {
                                id = "transaction-date-to"
                                title = "To Date"
                            }
                            button(classes = "btn btn-secondary") { id = "clear-transaction-filters"; i(classes = "fas fa-times") { +" Clear" } }
                        }
                        button(classes = "btn btn-primary") { id = "add-transaction-btn"; i(classes = "fas fa-plus") { +" New Transaction" } }
                    }
                    div(classes = "table-container") { id = "transactions-table" }
                }

                // Invoices Section
                section(classes = "content-section") {
                    id = "invoices-section"
                    div(classes = "section-header") {
                        div(classes = "invoice-filters") {
                            input(type = InputType.text, classes = "search-input") {
                                id = "invoice-search"
                                placeholder = "Search by invoice number, recipient, part..."
                            }
                            select(classes = "filter-select") {
                                id = "invoice-type-filter"
                                option { value = ""; +"All Types" }
                                option { value = "CUSTOMER_COPY"; +"Customer Copy" }
                                option { value = "COMPANY_COPY"; +"Company Copy" }
                            }
                            select(classes = "filter-select") {
                                id = "invoice-payment-filter"
                                option { value = ""; +"All Payments" }
                                option { value = "paid"; +"Paid" }
                                option { value = "unpaid"; +"Unpaid" }
                                option { value = "partial"; +"Partial" }
                            }
                            input(type = InputType.date, classes = "date-input") {
                                id = "invoice-date-from"
                                title = "From Date"
                            }
                            input(type = InputType.date, classes = "date-input") {
                                id = "invoice-date-to"
                                title = "To Date"
                            }
                            button(classes = "btn btn-secondary") { id = "clear-invoice-filters"; i(classes = "fas fa-times") { +" Clear" } }
                        }
                        button(classes = "btn btn-primary") { id = "print-invoice-btn"; i(classes = "fas fa-print") { +" Print Invoice" } }
                    }
                    div(classes = "table-container") { id = "invoices-table" }
                }

                // Low Stock Section
                section(classes = "content-section") {
                    id = "low-stock-section"
                    div(classes = "parts-grid") { id = "low-stock-grid" }
                }

                // Reports Section
                section(classes = "content-section") {
                    id = "reports-section"
                    div(classes = "reports-grid") {
                        div(classes = "report-card") {
                            h3 { +"Category Statistics" }
                            div(classes = "stats-list") { id = "category-stats" }
                        }
                        div(classes = "report-card") {
                            h3 { +"Inventory Analysis" }
                            div(classes = "analysis-content") { id = "inventory-analysis" }
                        }
                    }
                }
            }
        }

        // Modals
        div(classes = "modal") {
            id = "part-modal"
            div(classes = "modal-content") {
                div(classes = "modal-header") {
                    h3 { id = "part-modal-title"; +"Add New Part" }
                    span(classes = "close") { +"×" }
                }
                form {
                    id = "part-form"
                    div(classes = "form-grid") {
                        div(classes = "form-group") {
                            label { htmlFor = "part-name"; +"Part Name *" }
                            input(type = InputType.text) { id = "part-name"; required = true }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-number"; +"Part Number *" }
                            input(type = InputType.text) { id = "part-number"; required = true }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-category"; +"Category *" }
                            div(classes = "searchable-select-container") {
                                div(classes = "searchable-select") {
                                    id = "part-category-container"
                                    input(type = InputType.text, classes = "search-input") {
                                        id = "part-category-search"
                                        placeholder = "Search or type new category..."
                                        autoComplete = "off"
                                        required = true
                                    }
                                    button(type = ButtonType.button, classes = "dropdown-toggle") {
                                        id = "part-category-toggle"
                                        i(classes = "fas fa-chevron-down")
                                    }
                                    div(classes = "dropdown-menu") {
                                        id = "part-category-dropdown"
                                        div(classes = "dropdown-item create-new") {
                                            id = "create-new-category"
                                            i(classes = "fas fa-plus") { +" Create new category" }
                                        }
                                        div(classes = "dropdown-divider")
                                        div(classes = "dropdown-items") { id = "category-dropdown-items" }
                                    }
                                }
                                input(type = InputType.hidden) {
                                    id = "part-category"
                                    name = "part-category"
                                    required = true
                                }
                            }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-price"; +"Unit Price *" }
                            input(type = InputType.number) { id = "part-price"; step = "0.01"; required = true }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-stock"; +"Initial Stock" }
                            input(type = InputType.number) { id = "part-stock"; value = "0" }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-min-stock"; +"Minimum Stock *" }
                            input(type = InputType.number) { id = "part-min-stock"; required = true }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-max-stock"; +"Maximum Stock" }
                            input(type = InputType.number) { id = "part-max-stock" }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-location"; +"Location" }
                            input(type = InputType.text) { id = "part-location" }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-supplier"; +"Supplier" }
                            input(type = InputType.text) { id = "part-supplier" }
                        }
                        div(classes = "form-group") {
                            label { htmlFor = "part-machine-models"; +"Machine Models" }
                            input(type = InputType.text) {
                                id = "part-machine-models"
                                placeholder = "Comma separated"
                            }
                        }
                        div(classes = "form-group full-width") {
                            label { htmlFor = "part-description"; +"Description" }
                            textArea { id = "part-description"; rows = "3" }
                        }
                    }
                    div(classes = "modal-actions") {
                        button(type = ButtonType.button, classes = "btn btn-secondary") { id = "cancel-part"; +"Cancel" }
                        button(type = ButtonType.submit, classes = "btn btn-primary") { +"Save Part" }
                    }
                }
            }
        }

        div(classes = "modal") {
            id = "category-modal"
            div(classes = "modal-content") {
                div(classes = "modal-header") {
                    h3 { id = "category-modal-title"; +"Add New Category" }
                    span(classes = "close") { +"×" }
                }
                form {
                    id = "category-form"
                    div(classes = "form-group") {
                        label { htmlFor = "category-name"; +"Category Name *" }
                        input(type = InputType.text) { id = "category-name"; required = true }
                    }
                    div(classes = "form-group") {
                        label { htmlFor = "category-description"; +"Description" }
                        textArea { id = "category-description"; rows = "3" }
                    }
                    div(classes = "modal-actions") {
                        button(type = ButtonType.button, classes = "btn btn-secondary") { id = "cancel-category"; +"Cancel" }
                        button(type = ButtonType.submit, classes = "btn btn-primary") { +"Save Category" }
                    }
                }
            }
        }

        transactionModal()

        div(classes = "modal") {
            id = "part-details-modal"
            div(classes = "modal-content large") {
                div(classes = "modal-header") {
                    h3 { id = "part-details-title"; +"Part Details" }
                    span(classes = "close") { +"×" }
                }
                div { id = "part-details-content" }
            }
        }

        div(classes = "modal") {
            id = "payment-update-modal"
            div(classes = "modal-content compact") {
                div(classes = "modal-header") {
                    h3 { i(classes = "fas fa-dollar-sign") { +" Update Payment" } }
                    span(classes = "close") { +"×" }
                }
                div(classes = "modal-body compact") {
                    div(classes = "payment-summary-compact") {
                        div(classes = "summary-row") {
                            span(classes = "summary-label") { +"Transaction:" }
                            span(classes = "summary-value") { id = "payment-transaction-id"; +"- " }
                        }
                        div(classes = "summary-row") {
                            span(classes = "summary-label") { +"Part:" }
                            span(classes = "summary-value") { id = "payment-part-name"; +"- " }
                        }
                        div(classes = "summary-row highlight") {
                            span(classes = "summary-label") { +"Total:" }
                            span(classes = "summary-value amount-highlight") { id = "payment-total-amount"; +"$0.00" }
                        }
                        div(classes = "summary-row") {
                            span(classes = "summary-label") { +"Paid:" }
                            span(classes = "summary-value amount-current") { id = "payment-current-amount"; +"$0.00" }
                        }
                        div(classes = "summary-row") {
                            span(classes = "summary-label") { +"Remaining:" }
                            span(classes = "summary-value amount-remaining") { id = "payment-remaining-amount"; +"$0.00" }
                        }
                    }
                    div(classes = "payment-input-compact") {
                        label { htmlFor = "payment-amount"; +"Payment Amount" }
                        div(classes = "payment-input-group compact") {
                            span(classes = "currency-symbol") { +"$" }
                            input(type = InputType.number) {
                                id = "payment-amount"
                                step = "0.01"
                                min = "0"
                                required = true
                            }
                            button(type = ButtonType.button, classes = "btn btn-xs btn-secondary") { id = "pay-full-amount"; +"Full" }
                        }
                    }
                    div(classes = "payment-options-compact") {
                        label(classes = "checkbox-label compact") {
                            input(type = InputType.checkBox) { id = "mark-as-paid" }
                            +" Mark as fully paid"
                        }
                    }
                    div(classes = "payment-preview-compact") {
                        id = "payment-preview"
                        div(classes = "preview-row") {
                            span { +"New Total:" }
                            span(classes = "preview-amount") { id = "preview-new-total"; +"$0.00" }
                        }
                        div(classes = "preview-row") {
                            span { +"Status:" }
                            span(classes = "preview-status") { id = "preview-status"; +"Partial" }
                        }
                    }
                }
                div(classes = "modal-actions compact") {
                    button(type = ButtonType.button, classes = "btn btn-secondary btn-sm") { id = "cancel-payment-update"; +"Cancel" }
                    button(type = ButtonType.button, classes = "btn btn-primary btn-sm") {
                        id = "confirm-payment-update"
                        i(classes = "fas fa-check") { +" Update" }
                    }
                }
            }
        }

        div(classes = "loading-overlay") {
            id = "loading"
            div(classes = "spinner")
        }

        div(classes = "toast-container") { id = "toast-container" }

        script { src = "/static/app.js"; type = "module" }
    }
}
