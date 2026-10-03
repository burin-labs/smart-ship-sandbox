"""Tiny arithmetic helpers used by the Smart Ship repair scenarios."""


def add(a, b):
    return a + b


def mul(a, b):
    return a * b


def mean(values):
    if not values:
        raise ValueError("mean of an empty list")
    return sum(values) / len(values)
