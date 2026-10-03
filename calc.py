"""Tiny arithmetic helpers used by the Smart Ship repair scenarios."""


def add(a, b):
    return a + b


def mul(a, b):
    return a * b


def mean(values):
    if not values:
        raise ValueError("mean of an empty list")
    return sum(values) / len(values)


def median(values):
    if not values:
        raise ValueError("median of an empty list")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2
