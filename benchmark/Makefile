# ===========================================================================
# Makefile — Benchmark: T-Tree vs B-Tree
# ===========================================================================

CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra -Wpedantic -O3 -I../ttree/src -I../btree/src

SRC_TTREE = ../ttree/src/ttree.c
SRC_BTREE = ../btree/src/btree.c
SRC_BENCH = benchmark.c

TARGET = run_benchmark

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(SRC_BENCH) $(SRC_TTREE) $(SRC_BTREE)
	$(CC) $(CFLAGS) $(SRC_BENCH) $(SRC_TTREE) $(SRC_BTREE) -o $(TARGET) -lm

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
