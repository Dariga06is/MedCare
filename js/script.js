// ==========================================
// MEDCARE - MAIN JAVASCRIPT
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const searchInput = document.getElementById("specialtySearch");
    const searchButton = document.getElementById("searchButton");
    const cards = document.querySelectorAll(".home-specialty-card");
    const noResults = document.getElementById("noResults");


    // ==========================================
    // ПОИСК
    // ==========================================

    function searchSpecialties() {

        const searchText = searchInput.value
            .toLowerCase()
            .trim();

        let found = 0;


        cards.forEach(function (card) {

            const name = card
                .getAttribute("data-name")
                .toLowerCase();

            const cardText = card
                .innerText
                .toLowerCase();


            if (
                name.includes(searchText) ||
                cardText.includes(searchText)
            ) {

                card.style.display = "flex";

                found++;

            } else {

                card.style.display = "none";

            }

        });


        // Егер ештеңе табылмаса

        if (found === 0) {

            noResults.style.display = "block";

        } else {

            noResults.style.display = "none";

        }

    }


    // ==========================================
    // ЖАЗҒАН КЕЗДЕ АВТОМАТТЫ ІЗДЕУ
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            searchSpecialties
        );

    }


    // ==========================================
    // ІЗДЕУ БАТЫРМАСЫ
    // ==========================================

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            searchSpecialties
        );

    }


    // ==========================================
    // ENTER БАСҚАНДА ІЗДЕУ
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    searchSpecialties();

                }

            }
        );

    }

});