from collections import Counter
import threading
import time

import torch


class Metrics:
    """Small, dependency-free Prometheus exporter with low-cardinality labels only."""

    def __init__(self):
        self._lock = threading.Lock()
        self._counters: Counter[tuple[str, str]] = Counter()
        self._latency_sum = 0.0
        self._latency_count = 0
        self._stage_latency: Counter[str] = Counter()
        self._stage_count: Counter[str] = Counter()

    def observe_case(self, status: str, elapsed_seconds: float, invalid: int, conflict: bool):
        with self._lock:
            self._counters[("requests", status)] += 1
            self._counters[("invalid_images", "total")] += invalid
            self._counters[("conflicting_cases", "total")] += int(conflict)
            self._latency_sum += elapsed_seconds
            self._latency_count += 1

    def observe_stage(self, stage: str, elapsed_seconds: float):
        with self._lock:
            self._stage_latency[stage] += elapsed_seconds
            self._stage_count[stage] += 1

    def render(self) -> str:
        with self._lock:
            lines = [
                "# TYPE derma_ai_cases_total counter",
                *[
                    f'derma_ai_cases_total{{status="{status}"}} {value}'
                    for (metric, status), value in sorted(self._counters.items())
                    if metric == "requests"
                ],
                "# TYPE derma_ai_invalid_images_total counter",
                f'derma_ai_invalid_images_total {self._counters[("invalid_images", "total")]}',
                "# TYPE derma_ai_conflicting_cases_total counter",
                f'derma_ai_conflicting_cases_total {self._counters[("conflicting_cases", "total")]}',
                "# TYPE derma_ai_case_latency_seconds summary",
                f"derma_ai_case_latency_seconds_sum {self._latency_sum:.6f}",
                f"derma_ai_case_latency_seconds_count {self._latency_count}",
                "# TYPE derma_ai_stage_latency_seconds summary",
                *[
                    f'derma_ai_stage_latency_seconds_sum{{stage="{stage}"}} {value:.6f}'
                    for stage, value in sorted(self._stage_latency.items())
                ],
                *[
                    f'derma_ai_stage_latency_seconds_count{{stage="{stage}"}} {value}'
                    for stage, value in sorted(self._stage_count.items())
                ],
                "# TYPE derma_ai_gpu_memory_bytes gauge",
                f"derma_ai_gpu_memory_bytes {torch.cuda.memory_allocated() if torch.cuda.is_available() else 0}",
            ]
        return "\n".join(lines) + "\n"


metrics = Metrics()
monotonic = time.monotonic
