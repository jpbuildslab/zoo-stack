"""Exercise package boundaries with disposable good and broken examples."""

from pathlib import Path
import tempfile
import unittest
import package_checks as checks


class PackageChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.skill = self.root / "sample"
        self.skill.mkdir()
        self.entry = self.skill / "SKILL.md"
        self.entry.write_text("---\nname: sample\ndescription: Review a scoped change.\n---\n\nUse local source.\n")

    def test_self_contained_reference(self):
        target = self.skill / "references" / "local note.md"
        target.parent.mkdir()
        target.write_text("# Local note\n")
        self.entry.write_text(self.entry.read_text() + "[Note](references/local%20note.md#local-note)\n")
        checks.validate_skill(self.skill)
        self.assertEqual(checks.check_markdown(self.entry, self.skill), 1)

    def test_sibling_dependency_is_not_portable(self):
        (self.root / "product.md").write_text("Private product rules")
        self.entry.write_text(self.entry.read_text() + "[Product](../product.md)\n")
        with self.assertRaises(ValueError):
            checks.check_markdown(self.entry, self.skill)

    def test_symlink_cannot_escape_package(self):
        (self.root / "outside.md").write_text("Outside")
        self.entry.unlink()
        self.entry.symlink_to(self.root / "outside.md")
        with self.assertRaises(ValueError):
            checks.validate_skill(self.skill)

    def test_missing_reference_rejected(self):
        self.entry.write_text(self.entry.read_text() + "[Missing](missing.md)\n")
        with self.assertRaises(ValueError):
            checks.check_markdown(self.entry, self.skill)

    def test_wrong_discovery_identity_rejected(self):
        self.entry.write_text(self.entry.read_text().replace("name: sample", "name: different"))
        with self.assertRaises(ValueError):
            checks.validate_skill(self.skill)

    def test_private_home_reference_rejected(self):
        self.entry.write_text(self.entry.read_text() + "Read /home/example/private-project/rules.md.\n")
        with self.assertRaises(ValueError):
            checks.validate_skill(self.skill)


    def test_companion_policy_is_explicit(self):
        package = self.root / "zoo-ui-craft"
        package.mkdir()
        (package / "SKILL.md").write_text(self.entry.read_text().replace("name: sample", "name: zoo-ui-craft"))
        with self.assertRaises(OSError):
            checks.validate_skill(package)
        (package / "agents").mkdir()
        meta = package / "agents/openai.yaml"
        meta.write_text("policy:\n  allow_implicit_invocation: true\n")
        with self.assertRaises(ValueError):
            checks.validate_skill(package)
        meta.write_text("policy:\n  allow_implicit_invocation: false\n")
        checks.validate_skill(package)

    def test_fragment_external_and_angle_links(self):
        (self.skill / "local note.md").write_text("# Note\n")
        self.entry.write_text(self.entry.read_text() +
            "[Anchor](#local) [External](https://example.com) [Contact](mailto:example@example.com) [Note](<local%20note.md>)\n")
        self.assertEqual(checks.check_markdown(self.entry, self.skill), 1)


if __name__ == "__main__":
    unittest.main()
