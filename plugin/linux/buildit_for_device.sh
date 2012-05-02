#!/bin/bash

#######################################################################
##### Enter the name of the file or directory to be sent to device  ###
##### APP="<name of app file> or <appdir>"                          ###
#######################################################################
export APP="AmrHelper"

#######################################################################
#### Enter the relative path to the executable here.                ###
#### EXEC="<relative path to exec>"                                 ###
#######################################################################
export EXEC="amr_helper"

#######################################################################
### List your source files here                                     ###
### SRC="<source1> <source2>"                                       ###
#######################################################################
export SRC="amr_helper.cpp"

SRCDIRAMR="../src/amr";
SRCDIROPENCORE=${SRCDIRAMR}/openamr/opencore/codecs_v2/audio/gsm_amr

SRCDIRPROXY="../src/proxy";
SRCDIRRECORD="../src/record";
SRCDIRFILE="../src/file";

SRCAMR="";
for name in "`find ${SRCDIROPENCORE}/common -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

for name in "`find ${SRCDIROPENCORE}/enc -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

#for name in "`find ${SRCDIROPENCORE}/dec -name \"*.cpp\"`"
#do
#		SRCAMR+=" "
#		SRCAMR+=$name
#done

for name in "`find ${SRCDIRAMR}/openamr/amrnb -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

for name in "`find ${SRCDIRAMR}/wave2amr -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

for name in "`find ${SRCDIRPROXY} -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

for name in "`find ${SRCDIRRECORD} -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

for name in "`find ${SRCDIRFILE} -name \"*.cpp\"`"
do
		SRCAMR+=" "
		SRCAMR+=$name
done

#echo $SRCAMR;

#######################################################################
### List the libraries needed.                                      ###
### LIBS="-l<libname>"                                              ###
#######################################################################
export LIBS="-lSDL -lGLESv2 -lpdl -lpthread -lasound"

#######################################################################
### Name your output executable                                     ###
### OUTFILE="<executable-name>"                                     ###
#######################################################################
export OUTFILE="amr_helper"


###################################
######## Do not edit below ########
###################################

###################################
######## Checking the setup #######
###################################

if [ ! "$PalmPDK" ];then
        export PalmPDK=/opt/PalmPDK
fi

# Set the device specific compiler options. By default, a binary that
# will run on both Pre and Pixi will be built. These option only need to be
# set for a particular device if more performance is necessary.
if [ "$1" == "pre" ]; then
	DEVICEOPTS="-mcpu=cortex-a8 -mfpu=neon -mfloat-abi=softfp"
else
	DEVICEOPTS="-mcpu=arm1136jf-s -mfpu=vfp -mfloat-abi=softfp"
fi

#export BUILDDIR="Build_Device"
export BUILDDIR="../../application"

PATH=$PATH:${PalmPDK}/arm-gcc/bin

CC="arm-none-linux-gnueabi-gcc"

ARCH=""
SYSROOT="${PalmPDK}/arm-gcc/sysroot"

INCLUDEDIR="${PalmPDK}/include"
INCLUDEDIRAC="${SRCDIROPENCORE}/common/include"
INCLUDEDIROSCL="${SRCDIRAMR}/openamr/oscl"
INCLUDEDIRENC="${SRCDIROPENCORE}/enc/src"
INCLUDEDIRDEC="${SRCDIROPENCORE}/dec/src"
INCLUDEDIRENCINC="${SRCDIROPENCORE}/enc/include"
INCLUDEDIRDECINC="${SRCDIROPENCORE}/dec/include"
INCLUDEDIRNB="${SRCDIRAMR}/openamr/amrnb"
INCLUDEDIRWAVE="${SRCDIRAMR}/wave2amr"
INCLUDEDIRPROXY="${SRCDIRPROXY}"
INCLUDEDIRRECORD="${SRCDIRRECORD}"
LIBDIR="${PalmPDK}/device/lib"

CPPFLAGS="-I${INCLUDEDIR} -I${INCLUDEDIR}/SDL --sysroot=$SYSROOT -I${INCLUDEDIRAC} -I${INCLUDEDIROSCL} -I${INCLUDEDIRENC} -I${INCLUDEDIRDEC} -I${INCLUDEDIRENCINC} -I${INCLUDEDIRDECINC} -I${INCLUDEDIRNB} -I${INCLUDEDIRWAVE} -I${INCLUDEDIRPROXY} -I${INCLUDEDIRRECORD} -I${SRCDIRFILE} -I."
echo $CPPFLAGS
LDFLAGS="-L${LIBDIR} -Wl,--allow-shlib-undefined"
SRCDIR="../src"
###################################

if [ -e "$BUILDDIR" ]; then
	if [ -e "$BUILDDIR/$OUTFILE" ]; then
		rm -rf "$BUILDDIR/$OUTFILE"
	fi
fi
mkdir -p $BUILDDIR

if [ "$SRC" == "" ];then
	echo "Source files not specified. Please edit the SRC variable inside this script."
	exit 1
fi

if [ "$OUTFILE" == "" ];then
	echo "Output file name not specified. Please edit the OUTFILE variable inside this script."
	exit 1
fi
echo "Building for Device"
echo "$CC $DEVICEOPTS $CPPFLAGS $LDFLAGS $LIBS -o $BUILDDIR/$OUTFILE $SRCDIR/$SRC "
######$SRCAMR
$CC $DEVICEOPTS $CPPFLAGS $LDFLAGS $LIBS -o $BUILDDIR/$OUTFILE $SRCDIR/$SRC $SRCAMR

echo -e "\nPutting binary into $BUILDDIR.\n"
