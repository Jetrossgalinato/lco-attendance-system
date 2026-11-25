"""Seeded calculator inventory for the borrowing desk."""


def build_seed_calculators(count: int = 16) -> list[dict[str, str | None]]:
    return [
        {
            "id": f"CALC-{index:02d}",
            "label": f"Calculator {index:02d}",
        }
        for index in range(1, count + 1)
    ]
