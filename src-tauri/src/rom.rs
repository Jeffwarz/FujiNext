//! Identify an Atari TOS / EmuTOS ROM image from its header.
//!
//! This is how Hatari itself does it (src/tos.c): the TOS version is the
//! big-endian 16-bit word at offset 2 (0x0404 is TOS 4.04), and EmuTOS has the
//! marker "ETOS" at offset 0x2C. Reading the file means a ROM is recognised
//! whatever it is called.
//!
//! Standard library only, so it can be unit tested on its own
//! (`rustc --edition 2021 --test src/rom.rs`).

/// Number of bytes from the start of the file needed to identify it.
pub const HEADER_LEN: usize = 0x30;

#[derive(Debug, PartialEq, Eq)]
pub struct RomInfo {
    /// "TOS 4.04", or "EmuTOS".
    pub tos_version: String,
    /// The machine this ROM was made for, when that is known.
    pub machine: Option<&'static str>,
}

/// Machine a given TOS version was made for.
fn machine_for(version: u16) -> Option<&'static str> {
    match version {
        0x0100 | 0x0102 | 0x0104 => Some("ST"),
        0x0106 | 0x0162 => Some("STE"),
        0x0205 | 0x0206 => Some("MegaSTE"),
        0x0306 => Some("TT"),
        0x0400 | 0x0401 | 0x0402 | 0x0404 => Some("Falcon"),
        _ => None,
    }
}

/// Identify a ROM from (at least) the first `HEADER_LEN` bytes of the file.
/// Returns `None` if it does not look like a TOS or EmuTOS image.
pub fn identify(header: &[u8]) -> Option<RomInfo> {
    if header.len() < HEADER_LEN {
        return None;
    }
    if &header[0x2c..0x30] == b"ETOS" {
        return Some(RomInfo { tos_version: "EmuTOS".to_string(), machine: None });
    }
    let version = u16::from_be_bytes([header[2], header[3]]);
    // Real TOS versions are 1.00 to 4.xx; anything else is not a TOS image.
    if !(0x0100..=0x04ff).contains(&version) {
        return None;
    }
    Some(RomInfo {
        tos_version: format!("TOS {:x}.{:02x}", version >> 8, version & 0xff),
        machine: machine_for(version),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header(version: u16, etos: bool) -> Vec<u8> {
        let mut h = vec![0u8; HEADER_LEN];
        h[0] = 0x60; // bra.s, as in a real ROM
        h[2..4].copy_from_slice(&version.to_be_bytes());
        if etos {
            h[0x2c..0x30].copy_from_slice(b"ETOS");
        }
        h
    }

    #[test]
    fn falcon_tos_404() {
        assert_eq!(
            identify(&header(0x0404, false)),
            Some(RomInfo { tos_version: "TOS 4.04".into(), machine: Some("Falcon") })
        );
    }

    #[test]
    fn other_machines() {
        for (v, name, machine) in [
            (0x0104u16, "TOS 1.04", "ST"),
            (0x0162, "TOS 1.62", "STE"),
            (0x0206, "TOS 2.06", "MegaSTE"),
            (0x0306, "TOS 3.06", "TT"),
        ] {
            let info = identify(&header(v, false)).unwrap();
            assert_eq!(info.tos_version, name);
            assert_eq!(info.machine, Some(machine));
        }
    }

    #[test]
    fn emutos_is_recognised_by_its_marker_not_its_version_word() {
        // EmuTOS reports the TOS version it imitates, so the marker must win.
        let info = identify(&header(0x0206, true)).unwrap();
        assert_eq!(info.tos_version, "EmuTOS");
        assert_eq!(info.machine, None);
    }

    #[test]
    fn unknown_but_plausible_version_is_still_named() {
        let info = identify(&header(0x0207, false)).unwrap();
        assert_eq!(info.tos_version, "TOS 2.07");
        assert_eq!(info.machine, None);
    }

    #[test]
    fn files_that_are_not_tos_are_rejected() {
        assert_eq!(identify(&header(0x0000, false)), None);
        assert_eq!(identify(&header(0xffff, false)), None);
        assert_eq!(identify(&header(0x0a00, false)), None);
    }

    #[test]
    fn too_short_input_is_rejected() {
        assert_eq!(identify(&[0u8; 10]), None);
        assert_eq!(identify(&[]), None);
    }
}
