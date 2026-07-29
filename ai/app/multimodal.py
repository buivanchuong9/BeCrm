from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import torch
from torch import nn
from torchvision.models import efficientnet_b0
from transformers import PhobertTokenizer, RobertaConfig, RobertaModel


PHOBERT_VOCAB_SIZE = 64_001


class SpatialAttention(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(2, 1, kernel_size=7, padding=3, bias=False)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        average = torch.mean(features, dim=1, keepdim=True)
        maximum = torch.max(features, dim=1, keepdim=True).values
        weights = torch.sigmoid(self.conv(torch.cat((average, maximum), dim=1)))
        return features * weights


class EmbeddingSqueezeExcitation(nn.Module):
    def __init__(self, embedding_size: int) -> None:
        super().__init__()
        hidden_size = max(1, embedding_size // 8)
        self.net = nn.Sequential(
            nn.Linear(embedding_size, hidden_size),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_size, embedding_size),
            nn.Sigmoid(),
        )

    def forward(self, embedding: torch.Tensor) -> torch.Tensor:
        return embedding * self.net(embedding)


class TextEncoder(nn.Module):
    def __init__(self, embedding_size: int) -> None:
        super().__init__()
        config = RobertaConfig(
            vocab_size=PHOBERT_VOCAB_SIZE,
            hidden_size=768,
            num_hidden_layers=12,
            num_attention_heads=12,
            intermediate_size=3072,
            hidden_act="gelu",
            hidden_dropout_prob=0.1,
            attention_probs_dropout_prob=0.1,
            max_position_embeddings=258,
            type_vocab_size=1,
            initializer_range=0.02,
            layer_norm_eps=1e-5,
            pad_token_id=1,
            bos_token_id=0,
            eos_token_id=2,
        )
        self.phobert = RobertaModel(config, add_pooling_layer=True)
        self.pool_weight = nn.Parameter(torch.empty(config.hidden_size))
        self.projection = nn.Sequential(
            nn.Linear(config.hidden_size, embedding_size),
            nn.LayerNorm(embedding_size),
        )

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        hidden = self.phobert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            return_dict=True,
        ).last_hidden_state
        scores = torch.einsum("bsh,h->bs", hidden, self.pool_weight)
        scores = scores.masked_fill(attention_mask == 0, torch.finfo(scores.dtype).min)
        weights = torch.softmax(scores, dim=1).unsqueeze(-1)
        return self.projection(torch.sum(hidden * weights, dim=1))


class ImageEncoder(nn.Module):
    def __init__(self, embedding_size: int) -> None:
        super().__init__()
        backbone = efficientnet_b0(weights=None)
        self.features = backbone.features
        self.spatial_attn = SpatialAttention()
        self.projection = nn.Sequential(
            nn.Linear(1280, embedding_size),
            nn.LayerNorm(embedding_size),
        )
        self.se = EmbeddingSqueezeExcitation(embedding_size)

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        features = self.spatial_attn(self.features(image))
        pooled = torch.nn.functional.adaptive_avg_pool2d(features, output_size=1).flatten(1)
        return self.se(self.projection(pooled))


class MultimodalSkinModel(nn.Module):
    def __init__(self, class_count: int, embedding_size: int) -> None:
        super().__init__()
        self.text_encoder = TextEncoder(embedding_size)
        self.image_encoder = ImageEncoder(embedding_size)
        self.fusion_layer = nn.Linear(embedding_size * 2, embedding_size)
        self.classifier = nn.Linear(embedding_size, class_count)

    def forward(
        self,
        image: torch.Tensor,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        image_embedding = self.image_encoder(image)
        text_embedding = self.text_encoder(input_ids, attention_mask)
        fused = torch.relu(
            self.fusion_layer(torch.cat((image_embedding, text_embedding), dim=1))
        )
        return self.classifier(fused)


@dataclass(frozen=True)
class EncodedText:
    input_ids: torch.Tensor
    attention_mask: torch.Tensor


class LocalPhoBertTokenizer:
    def __init__(self, tokenizer_path: Path, max_length: int) -> None:
        vocab_path = tokenizer_path / "vocab.txt"
        merges_path = tokenizer_path / "bpe.codes"
        if not vocab_path.is_file() or not merges_path.is_file():
            raise FileNotFoundError(
                f"PhoBERT tokenizer files are missing from {tokenizer_path}."
            )
        self.tokenizer = PhobertTokenizer(
            vocab_file=str(vocab_path),
            merges_file=str(merges_path),
        )
        self.max_length = max_length

    def encode(self, text: str, device: torch.device) -> EncodedText:
        encoded = self.tokenizer(
            text,
            max_length=self.max_length,
            truncation=True,
            padding="max_length",
            return_tensors="pt",
        )
        return EncodedText(
            input_ids=encoded["input_ids"].to(device),
            attention_mask=encoded["attention_mask"].to(device),
        )
