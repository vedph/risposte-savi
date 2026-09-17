"""Matching views with offsets into the unmodified Unicode source."""
from dataclasses import dataclass
import re
import unicodedata


@dataclass(frozen=True)
class MatchingText:
    original: str
    text: str
    offsets: tuple

    def span(self, start, end):
        """Translate a nonempty half-open match into Python code point offsets."""
        if not 0 <= start < end <= len(self.offsets):
            raise ValueError('Invalid matching span')
        return self.offsets[start][0], self.offsets[end - 1][1]


def matching_text(text, expansions=False):
    """Fold case, accents, u/v, j/i, apostrophes and spaces only for matching.

    Brackets are elided only in alphabetic in-word expansions, e.g. Ott[avi]o.
    Standalone editorial insertions and malformed brackets are never joined.
    Every output character maps back to its original source interval.
    """
    if not isinstance(text, str):
        raise ValueError('Text must be a string')
    ignored = set()
    if expansions:
        for match in re.finditer(r'(?<=[^\W\d_])\[([^\W\d_]+)\]', text):
            ignored.update((match.start(), match.end() - 1))
    chars, offsets = [], []
    for index, character in enumerate(text):
        if index in ignored:
            if character == ']' and offsets:
                offsets[-1] = (offsets[-1][0], index + 1)
            continue
        if unicodedata.combining(character):
            if offsets:
                offsets[-1] = (offsets[-1][0], index + 1)
            continue
        folded = ''.join(c for c in unicodedata.normalize('NFKD', character).casefold()
                         if not unicodedata.combining(c))
        folded = folded.replace('u', 'v').replace('j', 'i').replace('’', "'").replace('ʼ', "'")
        for char in folded:
            if char.isspace():
                char = ' '
                if chars and chars[-1] == ' ':
                    offsets[-1] = (offsets[-1][0], index + 1)
                    continue
            chars.append(char)
            offsets.append((index, index + 1))
    return MatchingText(text, ''.join(chars), tuple(offsets))


def source_digest(text):
    import hashlib
    return hashlib.sha256(text.encode('utf-8')).hexdigest()
