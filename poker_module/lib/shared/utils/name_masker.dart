/// ============================================================================
///  name_masker.dart
///  Censura dinâmica de nomes de oponentes (privacidade do cassino).
///
///  Regra: mantém os últimos [visibleSuffix] caracteres e substitui o resto
///  por asteriscos. Ex.: "Guilherme" -> "****lherme".
///  O número de asteriscos é estável (mínimo 3) para não vazar o tamanho do
///  nome original com precisão.
/// ============================================================================

class NameMasker {
  NameMasker._();

  /// Retorna o nome censurado.
  ///
  /// [name]            nome completo.
  /// [visibleSuffix]   quantos caracteres finais manter visíveis.
  /// [minAsterisks]    piso de asteriscos exibidos.
  static String mask(
    String? name, {
    int visibleSuffix = 5,
    int minAsterisks = 4,
  }) {
    final raw = (name ?? '').trim();
    if (raw.isEmpty) return '${'*' * minAsterisks}';

    // Nomes curtos demais ficam totalmente mascarados.
    if (raw.length <= visibleSuffix) {
      return '*' * (raw.length < minAsterisks ? minAsterisks : raw.length);
    }

    final suffix = raw.substring(raw.length - visibleSuffix);
    final hiddenLength = raw.length - visibleSuffix;
    final stars = '*' * (hiddenLength < minAsterisks ? minAsterisks : hiddenLength);
    return '$stars$suffix';
  }
}
